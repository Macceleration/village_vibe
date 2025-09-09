import QRCode from 'qrcode';

/**
 * Generate QR code for tribe services page
 */
export async function generateTribeServicesQR(
  tribeId: string, 
  options: {
    size?: number;
    margin?: number;
    color?: {
      dark?: string;
      light?: string;
    };
  } = {}
): Promise<string> {
  const baseUrl = window.location.origin;
  const url = `${baseUrl}/tribes/${tribeId}?tab=services`;
  
  const qrOptions = {
    width: options.size || 256,
    margin: options.margin || 2,
    color: {
      dark: options.color?.dark || '#000000',
      light: options.color?.light || '#FFFFFF',
    },
  };

  try {
    return await QRCode.toDataURL(url, qrOptions);
  } catch (error) {
    console.error('Failed to generate QR code:', error);
    throw new Error('Failed to generate QR code');
  }
}

/**
 * Generate QR code poster SVG for printing
 */
export async function generateTribeServicesPoster(
  tribeId: string,
  tribeName: string,
  options: {
    title?: string;
    subtitle?: string;
    qrSize?: number;
  } = {}
): Promise<string> {
  const qrDataUrl = await generateTribeServicesQR(tribeId, { 
    size: options.qrSize || 200 
  });
  
  const title = options.title || `${tribeName} Services`;
  const subtitle = options.subtitle || 'Offer help • Need help?';
  
  // Create SVG poster
  const svg = `
    <svg width="400" height="600" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
      <defs>
        <style>
          .title { font-family: Arial, sans-serif; font-size: 28px; font-weight: bold; text-anchor: middle; }
          .subtitle { font-family: Arial, sans-serif; font-size: 18px; text-anchor: middle; }
          .instruction { font-family: Arial, sans-serif; font-size: 14px; text-anchor: middle; }
          .url { font-family: monospace; font-size: 12px; text-anchor: middle; }
        </style>
      </defs>
      
      <!-- Background -->
      <rect width="400" height="600" fill="white" stroke="#e5e7eb" stroke-width="2"/>
      
      <!-- Header -->
      <text x="200" y="60" class="title" fill="#1f2937">${title}</text>
      <text x="200" y="90" class="subtitle" fill="#6b7280">${subtitle}</text>
      
      <!-- QR Code -->
      <image x="100" y="150" width="200" height="200" href="${qrDataUrl}"/>
      
      <!-- Instructions -->
      <text x="200" y="400" class="instruction" fill="#374151">Scan to access community services</text>
      <text x="200" y="430" class="instruction" fill="#374151">or visit:</text>
      <text x="200" y="460" class="url" fill="#6b7280">${window.location.origin}/tribes/${tribeId}</text>
      
      <!-- Footer -->
      <text x="200" y="520" class="instruction" fill="#9ca3af">• Offer your skills</text>
      <text x="200" y="540" class="instruction" fill="#9ca3af">• Request help</text>
      <text x="200" y="560" class="instruction" fill="#9ca3af">• Connect with neighbors</text>
    </svg>
  `;
  
  return svg;
}

/**
 * Download QR code as image
 */
export function downloadQRCode(dataUrl: string, filename: string = 'tribe-services-qr.png') {
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Download SVG poster
 */
export function downloadSVGPoster(svgContent: string, filename: string = 'tribe-services-poster.svg') {
  const blob = new Blob([svgContent], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.download = filename;
  link.href = url;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}