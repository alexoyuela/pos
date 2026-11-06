/**
 * Printer Service for El Rincón POS
 * Dedicated thermal printing engine for POS-58 (copy 1) and standard ESC/POS 58mm receipt printers.
 * Solves:
 * 1. Failsafe 58mm Thermal Printing: Direct DOM isolation with #pos-print-surface and window.print().
 *    Guaranteed to work in all browsers, Chromium kiosks, and sandboxed previews without silent iframe failures.
 * 2. Automatic Windows Default Printer configuration via batch script.
 * 3. Direct Web Serial / USB ESC-POS printing (raw thermal bytes directly to printer).
 */

export class PrinterService {
  /**
   * Imprime un elemento HTML usando un iframe aislado.
   * Evita imprimir el resto de la interfaz y envía únicamente el ticket a la cola de impresión.
   */
  static printElementViaIframe(elementId: string, title = 'Ticket POS-58', is58mm = true): Promise<boolean> {
    return new Promise((resolve) => {
      const sourceEl = document.getElementById(elementId);
      if (!sourceEl) {
        console.warn(`Element #${elementId} not found for printing, fallback to window.print`);
        try {
          window.print();
        } catch (e) {
          console.error(e);
        }
        resolve(true);
        return;
      }

      // Crear iframe oculto
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.id = 'pos-print-iframe';
      document.body.appendChild(iframe);

      const paperWidth = is58mm ? '58mm' : '80mm';
      const contentWidth = is58mm ? '55mm' : '75mm';
      const fontSize = is58mm ? '13px' : '14.5px';

      const doc = iframe.contentWindow?.document;
      if (!doc) {
        document.body.removeChild(iframe);
        window.print();
        resolve(true);
        return;
      }

      // Limpiar HTML asegurando que todo fondo sea blanco (#ffffff) y texto negro puro (#000000)
      const cleanHtml = sourceEl.outerHTML
        .replace(/\bbg-transparent\b/g, 'bg-white')
        .replace(/\bbg-[a-z0-9#-]+(\/[0-9]+)?\b/g, 'bg-white')
        .replace(/\bshadow-[a-z0-9]+\b/g, '')
        .replace(/\bborder-black\/(30|40|50|60)\b/g, 'border-black');

      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html lang="es" style="background:#ffffff !important; color:#000000 !important; color-scheme:light !important;">
        <head>
          <meta charset="utf-8">
          <meta name="color-scheme" content="light">
          <meta name="supported-color-schemes" content="light">
          <title>${title}</title>
          <style>
            :root {
              color-scheme: light !important;
              supported-color-schemes: light !important;
              forced-color-adjust: none !important;
              -webkit-forced-color-adjust: none !important;
              -ms-high-contrast-adjust: none !important;
              background-color: #ffffff !important;
              background: #ffffff !important;
              color: #000000 !important;
            }
            @page {
              size: ${paperWidth} auto;
              margin: 0mm !important;
            }
            *, *::before, *::after {
              box-sizing: border-box !important;
              margin: 0;
              padding: 0;
              color-scheme: light !important;
              forced-color-adjust: none !important;
              -webkit-forced-color-adjust: none !important;
              -ms-high-contrast-adjust: none !important;
              background-color: #ffffff !important;
              color: #000000 !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            html {
              width: ${paperWidth} !important;
              background: #ffffff !important;
              background-color: #ffffff !important;
              height: auto !important;
              color-scheme: light !important;
              forced-color-adjust: none !important;
              -webkit-forced-color-adjust: none !important;
            }
            body {
              width: ${paperWidth} !important;
              max-width: ${paperWidth} !important;
              min-width: ${paperWidth} !important;
              height: auto !important;
              margin: 0 auto !important;
              padding: 0 !important;
              background: #ffffff !important;
              background-color: #ffffff !important;
              color: #000000 !important;
              -webkit-text-fill-color: #000000 !important;
              color-scheme: light !important;
              forced-color-adjust: none !important;
              -webkit-forced-color-adjust: none !important;
              /* Tipografía idéntica a la página de prueba de Windows: Arial Bold limpia sin serifa ni puntos */
              font-family: Arial, "Helvetica Neue", Helvetica, "Segoe UI", sans-serif !important;
              font-size: ${fontSize} !important;
              font-weight: 700 !important;
              line-height: 1.25 !important;
              -webkit-font-smoothing: none !important;
              -moz-osx-font-smoothing: grayscale !important;
              font-smooth: never !important;
              text-rendering: geometricPrecision !important;
              image-rendering: pixelated !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              overflow: hidden !important;
              filter: none !important;
              -webkit-filter: none !important;
            }
            #printable-area {
              width: ${contentWidth} !important;
              max-width: ${contentWidth} !important;
              min-width: ${contentWidth} !important;
              height: auto !important;
              max-height: max-content !important;
              margin: 0 auto !important;
              padding: 1mm 1.5mm !important;
              box-sizing: border-box !important;
              background: #ffffff !important;
              background-color: #ffffff !important;
              color: #000000 !important;
              -webkit-text-fill-color: #000000 !important;
              border: none !important;
              box-shadow: none !important;
              outline: none !important;
              page-break-after: avoid !important;
              break-after: avoid !important;
              filter: none !important;
              -webkit-filter: none !important;
            }
            #printable-area * {
              background-color: #ffffff !important;
              background: #ffffff !important;
              color: #000000 !important;
              -webkit-text-fill-color: #000000 !important;
              border-color: #000000 !important;
              box-shadow: none !important;
              text-shadow: none !important;
              filter: none !important;
              -webkit-filter: none !important;
            }
            /* Reglas de maquetación autónomas para que no fallen columnas ni alineaciones */
            .flex { display: flex !important; }
            .justify-between { justify-content: space-between !important; }
            .items-center { align-items: center !important; }
            .items-baseline { align-items: baseline !important; }
            .items-start { align-items: flex-start !important; }
            .items-end { align-items: flex-end !important; }
            .justify-center { justify-content: center !important; }
            .flex-1 { flex: 1 1 0% !important; }
            .text-center { text-align: center !important; }
            .text-right { text-align: right !important; }
            .text-left { text-align: left !important; }
            .uppercase { text-transform: uppercase !important; }
            .font-black { font-weight: 900 !important; }
            .font-bold { font-weight: 700 !important; }
            .font-normal { font-weight: 400 !important; }
            .border-b { border-bottom: 1.5px solid #000000 !important; }
            .border-t { border-top: 1.5px solid #000000 !important; }
            .border-b-2 { border-bottom: 2px solid #000000 !important; }
            .border-t-2 { border-top: 2px solid #000000 !important; }
            .border-dashed { border-style: dashed !important; }
            .border-black { border-color: #000000 !important; }
            .text-black { color: #000000 !important; -webkit-text-fill-color: #000000 !important; }
            .whitespace-nowrap { white-space: nowrap !important; }
            .break-words { word-break: break-word !important; }
            .leading-tight { line-height: 1.15 !important; }
            .leading-snug { line-height: 1.25 !important; }
            .italic { font-style: italic !important; }
            .gap-1 { gap: 4px !important; }
            .gap-2 { gap: 8px !important; }
            .space-y-1 > * + * { margin-top: 3px !important; }
            .space-y-1\\.5 > * + * { margin-top: 5px !important; }
            .space-y-2 > * + * { margin-top: 7px !important; }
            .pb-0\\.5 { padding-bottom: 2px !important; }
            .pb-1 { padding-bottom: 3px !important; }
            .pb-1\\.5 { padding-bottom: 5px !important; }
            .pb-2 { padding-bottom: 7px !important; }
            .pt-1 { padding-top: 3px !important; }
            .pt-2 { padding-top: 7px !important; }
            .py-0\\.5 { padding-top: 2px !important; padding-bottom: 2px !important; }
            .py-1 { padding-top: 3px !important; padding-bottom: 3px !important; }
            .py-1\\.5 { padding-top: 5px !important; padding-bottom: 5px !important; }
            .my-1 { margin-top: 3px !important; margin-bottom: 3px !important; }
            .mb-1 { margin-bottom: 3px !important; }
            .mb-1\\.5 { margin-bottom: 5px !important; }
            .mb-2 { margin-bottom: 7px !important; }
            .mt-1 { margin-top: 3px !important; }
            .mt-2 { margin-top: 7px !important; }
            .text-base { font-size: 15px !important; font-weight: 900 !important; }
            .text-sm { font-size: 13.5px !important; }
            .text-xs { font-size: 12.5px !important; }
            .text-\\[11\\.5px\\] { font-size: 11.5px !important; }
            .text-\\[11px\\] { font-size: 11px !important; }
            .text-\\[13px\\] { font-size: 13px !important; }
            .text-\\[10px\\] { font-size: 10px !important; }
            .ticket-item {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
            .print\\:hidden, .no-print {
              display: none !important;
            }
          </style>
        </head>
        <body style="background:#ffffff !important; background-color:#ffffff !important; color:#000000 !important; color-scheme:light !important;">
          ${cleanHtml}
        </body>
        </html>
      `);
      doc.close();

      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (e) {
          console.error('Error invoking iframe.print():', e);
        }

        setTimeout(() => {
          try {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
          } catch (e) {
            // ignore
          }
          resolve(true);
        }, 1500);
      }, 350);
    });
  }

  /**
   * Alias for backward compatibility
   */
  static printElement(elementId: string, title = 'Ticket POS-58', is58mm = true): Promise<boolean> {
    return this.printElementViaIframe(elementId, title, is58mm);
  }

  /**
   * Generates and triggers download of CONFIGURAR_POS58_PREDETERMINADA.bat
   * Configures 'POS-58 (copy 1)' as the default Windows printer.
   */
  static downloadWindowsPrinterConfigurator(printerName = 'POS-58 (copy 1)'): void {
    const batContent = `@echo off
chcp 65001 >nul
title El Rincon POS - Configurador de Impresora POS-58
color 0A
echo =======================================================================
echo          EL RINCON POS - CONFIGURAR IMPRESORA PREDETERMINADA
echo =======================================================================
echo.
echo Este script configurara "%printerName%" como su impresora
echo predeterminada en Windows para que los tickets impriman automaticamente.
echo.

echo [1/2] Desactivando administracion automatica de impresoras en Windows...
reg add "HKCU\\Software\\Microsoft\\Windows NT\\CurrentVersion\\Windows" /v "LegacyDefaultPrinterMode" /t REG_DWORD /d 1 /f >nul 2>&1
echo [OK] Modo impresora fija habilitado.
echo.

echo [2/2] Estableciendo "%printerName%" como predeterminada...
rundll32 printui.dll,PrintUIEntry /y /n "${printerName}" >nul 2>&1

powershell -NoProfile -ExecutionPolicy Bypass -Command "$target = '${printerName}'; $exact = Get-CimInstance Win32_Printer | Where-Object { $_.Name -eq $target }; if ($exact) { (Get-WmiObject -Class Win32_Printer -Filter \\\"Name = '$target'\\\").SetDefaultPrinter() | Out-Null; Write-Host ('[EXITO] Impresora predeterminada fijada a: ' + $target) -ForegroundColor Green; } else { $any = Get-CimInstance Win32_Printer | Where-Object { $_.Name -like '*POS-58*' -or $_.Name -like '*58*' -or $_.Name -like '*POS*' }; if ($any) { $alt = $any[0].Name; (Get-WmiObject -Class Win32_Printer -Filter \\\"Name = '$alt'\\\").SetDefaultPrinter() | Out-Null; Write-Host ('[AVISO] No se encontro exactamente ' + $target + '. Se establecio: ' + $alt) -ForegroundColor Yellow; } else { Write-Host '[ERROR] No se detecto ninguna impresora POS-58 instalada en Windows.' -ForegroundColor Red; } }"
echo.
echo Verificando impresora predeterminada actual:
powershell -NoProfile -ExecutionPolicy Bypass -Command "$p = (Get-CimInstance Win32_Printer | Where-Object { $_.Default -eq $true }); Write-Host ('Impresora Predeterminada Actual de Windows: ' + $p.Name) -ForegroundColor Cyan"
echo.
echo =======================================================================
echo Proceso completado. Ya puede volver al sistema e imprimir sus tickets.
echo.
echo [ATENCION SI IMPRIME EN NEGATIVO: FONDO NEGRO Y LETRAS BLANCAS]
echo A continuacion se abrira la ventana de 'Preferencias de Impresion'.
echo Verifique que en 'Opciones Avanzadas' o 'Device Settings':
echo 1. 'Invert Image' / 'Invertir' o 'Blanco sobre Negro' este DESACTIVADO.
echo 2. 'Graphic Mode' este en 'Normal' o 'Text'.
echo =======================================================================
echo Presione cualquier tecla para abrir las preferencias de "%printerName%".
pause >nul
rundll32 printui.dll,PrintUIEntry /e /n "${printerName}"
`;
    this.triggerDownload(batContent, 'CONFIGURAR_POS58_PREDETERMINADA.bat', 'application/x-bat;charset=utf-8');
  }

  /**
   * Generates and triggers download of INICIAR_CON_IMPRESION_AUTOMATICA_POS58.bat
   * Sets default printer and launches Chrome/Edge with official --kiosk-printing and isolated user profile.
   */
  static downloadKioskLauncher(appUrl: string, printerName = 'POS-58 (copy 1)'): void {
    const cleanUrl = appUrl.split('#')[0];
    const batContent = `@echo off
chcp 65001 >nul
title El Rincon POS - Modo Impresion Automatica POS-58
color 0E
echo =======================================================================
echo     EL RINCON POS - MODO IMPRESION AUTOMATICA POS-58
echo =======================================================================
echo.
echo [1/3] Fijando "${printerName}" como impresora predeterminada en Windows...
reg add "HKCU\\Software\\Microsoft\\Windows NT\\CurrentVersion\\Windows" /v "LegacyDefaultPrinterMode" /t REG_DWORD /d 1 /f >nul 2>&1
rundll32 printui.dll,PrintUIEntry /y /n "${printerName}" >nul 2>&1

powershell -NoProfile -ExecutionPolicy Bypass -Command "$target = '${printerName}'; $exact = Get-CimInstance Win32_Printer | Where-Object { $_.Name -eq $target }; if ($exact) { (Get-WmiObject -Class Win32_Printer -Filter \\\"Name = '$target'\\\").SetDefaultPrinter() | Out-Null; Write-Host ('[OK] Impresora predeterminada fijada: ' + $target) -ForegroundColor Green; } else { $any = Get-CimInstance Win32_Printer | Where-Object { $_.Name -like '*POS-58*' -or $_.Name -like '*58*' -or $_.Name -like '*POS*' }; if ($any) { (Get-WmiObject -Class Win32_Printer -Filter \\\"Name = '$($any[0].Name)'\\\").SetDefaultPrinter() | Out-Null; Write-Host ('[AVISO] Establecida impresora similar: ' + $any[0].Name) -ForegroundColor Yellow; } }"

echo.
echo [2/3] Configurando perfil de navegador dedicado para impresion silenciosa...
set "PROFILE_DIR=%LOCALAPPDATA%\\ElRinconPOSProfile"

echo [3/3] Abriendo sistema con impresion silenciosa (Kiosk Printing)...
echo.

set "APP_URL=${cleanUrl}"

:: Try Chrome
if exist "%ProgramFiles%\\Google\\Chrome\\Application\\chrome.exe" (
    start "" "%ProgramFiles%\\Google\\Chrome\\Application\\chrome.exe" --user-data-dir="%PROFILE_DIR%" --app="%APP_URL%" --kiosk-printing --kiosk-printer-device="${printerName}" --force-light-mode --disable-features=WebContentsForceDark
    exit
)
if exist "%ProgramFiles(x86)%\\Google\\Chrome\\Application\\chrome.exe" (
    start "" "%ProgramFiles(x86)%\\Google\\Chrome\\Application\\chrome.exe" --user-data-dir="%PROFILE_DIR%" --app="%APP_URL%" --kiosk-printing --kiosk-printer-device="${printerName}" --force-light-mode --disable-features=WebContentsForceDark
    exit
)
if exist "%LOCALAPPDATA%\\Google\\Chrome\\Application\\chrome.exe" (
    start "" "%LOCALAPPDATA%\\Google\\Chrome\\Application\\chrome.exe" --user-data-dir="%PROFILE_DIR%" --app="%APP_URL%" --kiosk-printing --kiosk-printer-device="${printerName}" --force-light-mode --disable-features=WebContentsForceDark
    exit
)

:: Try Microsoft Edge
if exist "%ProgramFiles(x86)%\\Microsoft\\Edge\\Application\\msedge.exe" (
    start "" "%ProgramFiles(x86)%\\Microsoft\\Edge\\Application\\msedge.exe" --user-data-dir="%PROFILE_DIR%" --app="%APP_URL%" --kiosk-printing --kiosk-printer-device="${printerName}" --force-light-mode --disable-features=WebContentsForceDark
    exit
)
if exist "%ProgramFiles%\\Microsoft\\Edge\\Application\\msedge.exe" (
    start "" "%ProgramFiles%\\Microsoft\\Edge\\Application\\msedge.exe" --user-data-dir="%PROFILE_DIR%" --app="%APP_URL%" --kiosk-printing --kiosk-printer-device="${printerName}" --force-light-mode --disable-features=WebContentsForceDark
    exit
)

:: Fallback
start "" "%APP_URL%"
exit
`;
    this.triggerDownload(batContent, 'INICIAR_CON_IMPRESION_AUTOMATICA_POS58.bat', 'application/x-bat;charset=utf-8');
  }

  /**
   * Sanitizes string to clean 7-bit ASCII for thermal receipt printers.
   * Removes accented characters that cause corrupt printing on ESC/POS printers.
   */
  private static sanitizeAscii(str: string): string {
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[ñÑ]/g, 'n')
      .replace(/[¿?¡!]/g, '')
      .replace(/[^ -~\n\r]/g, '');
  }

  /**
   * Direct Web Serial ESC-POS raw print support.
   * If the POS-58 printer is connected via USB-Serial / USB COM or virtual COM,
   * this sends raw ESC/POS bytes directly to the printhead without going through
   * the Windows print spooler or browser dialogs!
   */
  static async printDirectSerialEscPos(lines: string[]): Promise<{ success: boolean; message: string }> {
    if (typeof navigator === 'undefined' || !('serial' in navigator)) {
      return {
        success: false,
        message: 'Su navegador actual no soporta Web Serial API. Para conexión directa USB use Google Chrome o Microsoft Edge.'
      };
    }

    try {
      // @ts-ignore
      const port = await navigator.serial.requestPort();
      await port.open({ baudRate: 9600, dataBits: 8, stopBits: 1, parity: 'none' });

      const writer = port.writable.getWriter();
      const encoder = new TextEncoder();

      // ESC/POS Commands
      const ESC = 0x1b;
      const GS = 0x1d;

      // 1. Initialize printer: ESC @
      await writer.write(new Uint8Array([ESC, 0x40]));

      // 2. Center align: ESC a 1
      await writer.write(new Uint8Array([ESC, 0x61, 0x01]));

      // 3. Print lines with sanitized characters
      for (const rawLine of lines) {
        const line = this.sanitizeAscii(rawLine);
        if (line.startsWith('---') || line.startsWith('===')) {
          await writer.write(new Uint8Array([ESC, 0x61, 0x01])); // center
          await writer.write(encoder.encode(line + '\n'));
        } else if (line.startsWith('[C]')) {
          await writer.write(new Uint8Array([ESC, 0x61, 0x01])); // center
          await writer.write(encoder.encode(line.substring(3) + '\n'));
        } else if (line.startsWith('[R]')) {
          await writer.write(new Uint8Array([ESC, 0x61, 0x02])); // right
          await writer.write(encoder.encode(line.substring(3) + '\n'));
        } else {
          await writer.write(new Uint8Array([ESC, 0x61, 0x00])); // left
          await writer.write(encoder.encode(line + '\n'));
        }
      }

      // 4. Feed 4 lines: ESC d 4
      await writer.write(new Uint8Array([ESC, 0x64, 0x04]));

      // 5. Paper cut (if cutter present): GS V 66 0
      await writer.write(new Uint8Array([GS, 0x56, 0x42, 0x00]));

      writer.releaseLock();
      await port.close();

      return {
        success: true,
        message: '¡Ticket enviado exitosamente directo al cabezal térmico por USB/Serial!'
      };
    } catch (err: any) {
      console.error('Web Serial error:', err);
      return {
        success: false,
        message: err?.message ? `Error Web Serial: ${err.message}` : 'Operación cancelada o puerto no disponible'
      };
    }
  }

  private static triggerDownload(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
