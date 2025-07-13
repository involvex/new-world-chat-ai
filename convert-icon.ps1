# PowerShell script to convert PNG to ICO
Add-Type -AssemblyName System.Drawing

# Load the PNG image
$pngPath = "build\icon.png"
$icoPath = "build\icon.ico"

if (Test-Path $pngPath) {
    try {
        # Load the image
        $bitmap = [System.Drawing.Bitmap]::new($pngPath)
        
        # Create different sized versions
        $sizes = @(16, 32, 48, 64, 128, 256)
        $icons = @()
        
        foreach ($size in $sizes) {
            $resized = [System.Drawing.Bitmap]::new($bitmap, $size, $size)
            $icons += $resized
        }
        
        # Save as ICO (this is a simplified approach)
        $bitmap.Save($icoPath, [System.Drawing.Imaging.ImageFormat]::Icon)
        
        Write-Host "Successfully converted PNG to ICO"
        
        # Cleanup
        $bitmap.Dispose()
        foreach ($icon in $icons) {
            $icon.Dispose()
        }
    }
    catch {
        Write-Error "Failed to convert: $($_.Exception.Message)"
        
        # Fallback: just copy PNG as ICO (not ideal but might work)
        Copy-Item $pngPath $icoPath
        Write-Host "Copied PNG as ICO (fallback method)"
    }
} else {
    Write-Error "PNG file not found: $pngPath"
}
