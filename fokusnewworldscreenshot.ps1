Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Windows.Forms

# C# code to access Win32 API
$code = @"
using System;
using System.Runtime.InteropServices;

public class Win32 {
    [StructLayout(LayoutKind.Sequential)]
    public struct Rect {
        public int left;
        public int top;
        public int right;
        public int bottom;
    }

    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();

    [DllImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    public static extern bool GetWindowRect(IntPtr hWnd, out Rect lpRect);
    
    [DllImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    public static extern bool SetForegroundWindow(IntPtr hWnd);
}
"@

Add-Type -TypeDefinition $code -Language CSharp

# Find the New World process
$process = Get-Process -Name "NewWorld" -ErrorAction SilentlyContinue

if ($null -eq $process) {
    Write-Error "NewWorld.exe process not found."
    exit
}

$hwnd = $process.MainWindowHandle

# Bring the window to the foreground
[Win32]::SetForegroundWindow($hwnd) | Out-Null

# Wait a moment for the window to become active
Start-Sleep -Milliseconds 250

# Get the dimensions of the now-focused window
$rect = New-Object Win32+Rect
[Win32]::GetWindowRect($hwnd, [ref]$rect) | Out-Null

# Calculate window size
$width = $rect.right - $rect.left
$height = $rect.bottom - $rect.top

if ($width -gt 0 -and $height -gt 0) {
    $bitmap = New-Object System.Drawing.Bitmap $width, $height
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.CopyFromScreen($rect.left, $rect.top, 0, 0, $bitmap.Size)

    # Save to file and copy to clipboard
    $bitmap.Save("C:\Users\lukas\Downloads\screenshot.png")
    [System.Windows.Forms.Clipboard]::SetImage($bitmap)

    # Clean up
    $graphics.Dispose()
    $bitmap.Dispose()
} else {
    Write-Warning "New World window is minimized or has no size."
}