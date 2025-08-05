#!/usr/bin/env pwsh

# PowerShell version of build.compress.sh for Windows compatibility
# This script compresses all files in the build directory using gzip

$buildPath = "build"

if (Test-Path $buildPath) {
    Write-Host "Compressing files in $buildPath directory..."
    
    # Get all files recursively
    $files = Get-ChildItem -Path $buildPath -File -Recurse
    
    foreach ($file in $files) {
        try {
            # Skip already compressed files
            if ($file.Extension -ne ".gz") {
                Write-Host "Compressing: $($file.FullName)"
                
                # Read the file content
                $content = [System.IO.File]::ReadAllBytes($file.FullName)
                
                # Compress using .NET GZip
                $compressedPath = $file.FullName + ".gz"
                $fileStream = [System.IO.File]::Create($compressedPath)
                $gzipStream = New-Object System.IO.Compression.GZipStream($fileStream, [System.IO.Compression.CompressionMode]::Compress)
                $gzipStream.Write($content, 0, $content.Length)
                $gzipStream.Close()
                $fileStream.Close()
            }
        }
        catch {
            Write-Warning "Failed to compress $($file.FullName): $($_.Exception.Message)"
        }
    }
    
    Write-Host "Compression completed."
} else {
    Write-Warning "Build directory not found: $buildPath"
}