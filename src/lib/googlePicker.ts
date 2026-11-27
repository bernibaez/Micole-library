// Carga dinámica y segura de Google Picker API (sin exponer secretos ni tokens en el bundle).

export interface PickerSelectionItem {
  id: string;
  name: string;
  mimeType: string;
  url?: string;
}

export interface OpenGooglePickerOptions {
  accessToken: string;
  mode: 'files' | 'folders' | 'mixed';
  title?: string;
}

declare global {
  interface Window {
    gapi?: {
      load: (name: string, options: { callback: () => void; onerror?: () => void }) => void;
    };
    google?: {
      picker?: {
        PickerBuilder: new () => GooglePickerBuilder;
        DocsView: new (viewId?: string) => GoogleDocsView;
        ViewId: {
          DOCS: string;
          FOLDERS: string;
          PDFS: string;
        };
        DocsViewMode: {
          LIST: string;
          GRID: string;
        };
        Feature: {
          MULTISELECT_ENABLED: string;
          SUPPORT_DRIVES: string;
        };
        Action: {
          PICKED: string;
          CANCEL: string;
        };
      };
    };
  }
}

interface GoogleDocsView {
  setIncludeFolders: (include: boolean) => GoogleDocsView;
  setSelectFolderEnabled: (enabled: boolean) => GoogleDocsView;
  setMimeTypes: (mimeTypes: string) => GoogleDocsView;
  setMode: (mode: string) => GoogleDocsView;
  setLabel: (label: string) => GoogleDocsView;
}

interface GooglePickerBuilder {
  setAppId: (appId: string) => GooglePickerBuilder;
  setDeveloperKey: (apiKey: string) => GooglePickerBuilder;
  setOAuthToken: (token: string) => GooglePickerBuilder;
  setTitle: (title: string) => GooglePickerBuilder;
  setLocale: (locale: string) => GooglePickerBuilder;
  addView: (view: GoogleDocsView) => GooglePickerBuilder;
  enableFeature: (feature: string) => GooglePickerBuilder;
  setCallback: (cb: (data: GooglePickerCallbackData) => void) => GooglePickerBuilder;
  build: () => { setVisible: (visible: boolean) => void };
}

interface GooglePickerCallbackData {
  action: string;
  docs?: Array<{
    id: string;
    name: string;
    mimeType: string;
    url?: string;
  }>;
}

let pickerScriptPromise: Promise<void> | null = null;

export function isGooglePickerConfigured(): boolean {
  return Boolean(
    import.meta.env.VITE_GOOGLE_API_KEY?.trim() && import.meta.env.VITE_GOOGLE_APP_ID?.trim()
  );
}

function loadGapiPicker(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Google Picker solo funciona en el navegador.'));
  }
  if (window.google?.picker) {
    return Promise.resolve();
  }
  if (pickerScriptPromise) return pickerScriptPromise;

  pickerScriptPromise = new Promise<void>((resolve, reject) => {
    const initPicker = () => {
      if (!window.gapi) {
        reject(new Error('No se pudo inicializar Google API (gapi).'));
        return;
      }
      window.gapi.load('picker', {
        callback: () => resolve(),
        onerror: () => reject(new Error('No se pudo cargar el módulo Google Picker.')),
      });
    };

    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://apis.google.com/js/api.js"]'
    );
    if (existing) {
      if (window.gapi) initPicker();
      else existing.addEventListener('load', initPicker, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
    script.async = true;
    script.defer = true;
    script.onload = initPicker;
    script.onerror = () => {
      pickerScriptPromise = null;
      reject(new Error('No se pudo cargar https://apis.google.com/js/api.js.'));
    };
    document.head.appendChild(script);
  });

  return pickerScriptPromise;
}

export async function openGooglePicker({
  accessToken,
  mode,
  title,
}: OpenGooglePickerOptions): Promise<PickerSelectionItem[]> {
  const apiKey = import.meta.env.VITE_GOOGLE_API_KEY?.trim();
  const appId = import.meta.env.VITE_GOOGLE_APP_ID?.trim();

  if (!apiKey || !appId) {
    throw new Error(
      'Configura VITE_GOOGLE_API_KEY y VITE_GOOGLE_APP_ID en tu entorno para abrir Google Picker.'
    );
  }

  await loadGapiPicker();
  const pickerApi = window.google?.picker;
  if (!pickerApi) {
    throw new Error('Google Picker no está disponible en este navegador.');
  }

  return new Promise<PickerSelectionItem[]>((resolve) => {
    const builder = new pickerApi.PickerBuilder()
      .setAppId(appId)
      .setDeveloperKey(apiKey)
      .setOAuthToken(accessToken)
      .setLocale('es')
      .setTitle(
        title ??
          (mode === 'folders'
            ? 'Seleccionar carpetas de Google Drive'
            : 'Seleccionar documentos de Google Drive')
      )
      .enableFeature(pickerApi.Feature.MULTISELECT_ENABLED)
      .enableFeature(pickerApi.Feature.SUPPORT_DRIVES);

    if (mode === 'folders') {
      const folderView = new pickerApi.DocsView(pickerApi.ViewId.FOLDERS)
        .setIncludeFolders(true)
        .setSelectFolderEnabled(true)
        .setMimeTypes('application/vnd.google-apps.folder')
        .setMode(pickerApi.DocsViewMode.LIST)
        .setLabel('Carpetas');
      builder.addView(folderView);
    } else if (mode === 'files') {
      const pdfView = new pickerApi.DocsView(pickerApi.ViewId.DOCS)
        .setIncludeFolders(true)
        .setSelectFolderEnabled(false)
        .setMimeTypes(
          [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.google-apps.document',
            'application/vnd.google-apps.presentation',
            'application/vnd.google-apps.spreadsheet',
            'application/epub+zip',
            'text/plain',
          ].join(',')
        )
        .setMode(pickerApi.DocsViewMode.LIST)
        .setLabel('Documentos jurídicos');
      builder.addView(pdfView);
    } else {
      const allView = new pickerApi.DocsView(pickerApi.ViewId.DOCS)
        .setIncludeFolders(true)
        .setSelectFolderEnabled(true)
        .setMode(pickerApi.DocsViewMode.LIST)
        .setLabel('Archivos y carpetas');
      builder.addView(allView);
    }

    builder.setCallback((data) => {
      if (data.action === pickerApi.Action.PICKED) {
        const selected = (data.docs ?? []).map((doc) => ({
          id: doc.id,
          name: doc.name,
          mimeType: doc.mimeType,
          url: doc.url,
        }));
        resolve(selected);
      } else if (data.action === pickerApi.Action.CANCEL) {
        resolve([]);
      }
    });

    const picker = builder.build();
    picker.setVisible(true);
  });
}
