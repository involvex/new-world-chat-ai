# Simple PNG to ICO converter using Windows API
Add-Type -TypeDefinition @"
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;

public class IconConverter {
    public static void ConvertPngToIco(string pngPath, string icoPath) {
        using (var img = Image.FromFile(pngPath)) {
            using (var ms = new MemoryStream()) {
                // Create bitmap with proper format
                using (var bmp = new Bitmap(img, 256, 256)) {
                    // Write ICO header
                    ms.WriteByte(0);    // Reserved
                    ms.WriteByte(0);    // Reserved
                    ms.WriteByte(1);    // Type (1 = icon)
                    ms.WriteByte(0);    // Type high byte
                    ms.WriteByte(1);    // Number of images
                    ms.WriteByte(0);    // Number high byte
                    
                    // Write directory entry
                    ms.WriteByte(0);    // Width (0 = 256)
                    ms.WriteByte(0);    // Height (0 = 256)
                    ms.WriteByte(0);    // Colors
                    ms.WriteByte(0);    // Reserved
                    ms.WriteByte(1);    // Planes
                    ms.WriteByte(0);    // Planes high
                    ms.WriteByte(32);   // Bits per pixel
                    ms.WriteByte(0);    // Bits high
                    
                    // Placeholder for size and offset
                    long sizePos = ms.Position;
                    ms.Write(new byte[8], 0, 8);
                    
                    // Write PNG data
                    long dataStart = ms.Position;
                    using (var pngStream = new MemoryStream()) {
                        bmp.Save(pngStream, ImageFormat.Png);
                        var pngData = pngStream.ToArray();
                        ms.Write(pngData, 0, pngData.Length);
                    }
                    
                    // Update size and offset
                    long dataEnd = ms.Position;
                    ms.Seek(sizePos, SeekOrigin.Begin);
                    var size = (int)(dataEnd - dataStart);
                    ms.Write(BitConverter.GetBytes(size), 0, 4);
                    ms.Write(BitConverter.GetBytes((int)dataStart), 0, 4);
                    
                    // Write to file
                    File.WriteAllBytes(icoPath, ms.ToArray());
                }
            }
        }
    }
}
"@ -ReferencedAssemblies System.Drawing

try {
    [IconConverter]::ConvertPngToIco("build\icon.png", "build\icon.ico")
    Write-Host "Successfully created ICO file"
} catch {
    Write-Error "Failed to create ICO: $($_.Exception.Message)"
    # Fallback - create a minimal valid ICO header with PNG data
    $pngBytes = [System.IO.File]::ReadAllBytes("build\icon.png")
    $header = @(0,0,1,0,1,0,0,0,0,0,1,0,32,0) + [BitConverter]::GetBytes($pngBytes.Length) + [BitConverter]::GetBytes(22)
    $icoBytes = $header + $pngBytes
    [System.IO.File]::WriteAllBytes("build\icon.ico", $icoBytes)
    Write-Host "Created ICO with PNG fallback method"
}
