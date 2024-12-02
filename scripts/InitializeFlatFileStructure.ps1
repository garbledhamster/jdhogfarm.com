# InitializeFlatFileStructure.ps1
# Creates a flat-file folder structure with SEO and metadata files included.

# Get the parent directory of the "scripts" folder
$TargetDir = Join-Path (Get-Location).Path ".."

# Define folder structure
$structure = @{
    "assets/css"       = @("style.css")
    "assets/js"        = @("script.js")
    "assets/images"    = @()
    "assets/fonts"     = @()
    "assets/media"     = @()
    "content/pages"    = @("index.md", "about.md")
    "content/posts"    = @("example-post.md")
    "content/templates"= @("header.html", "footer.html")
    "content/snippets" = @("navigation.html")
    "data"             = @("sample.json")
    "config"           = @("site.yml", "routes.yml", "environment.yml")
    "logs"             = @("app.log")
    "tests"            = @("test_example.ps1")
}

# Define help text for files
$fileHelpText = @{
    "style.css"         = "/* Main stylesheet for the project */"
    "script.js"         = "// Main JavaScript file for the project"
    "index.md"          = "<!-- Home page content in Markdown -->"
    "about.md"          = "<!-- About page content in Markdown -->"
    "example-post.md"   = "<!-- Example blog post content in Markdown -->"
    "header.html"       = @"
<!-- HTML template for the header -->
<meta charset='UTF-8'>
<meta name='viewport' content='width=device-width, initial-scale=1.0'>
<title>My Site</title>
<meta name='description' content='A brief description of the site.'>
<meta name='keywords' content='example, metadata, SEO'>
"@
    "footer.html"       = "<!-- HTML template for the footer -->"
    "navigation.html"   = "<!-- Reusable navigation snippet -->"
    "sample.json"       = @"
{
  \"example\": \"sample data file\"
}
"@
    "site.yml"          = "# Global site configuration settings"
    "routes.yml"        = "# Custom routing rules for the site"
    "environment.yml"   = "# Environment-specific configuration"
    "app.log"           = "# Log file for tracking application activity"
    "test_example.ps1"  = "# Example test script for the project"
}

# Define SEO and metadata files
$seoFiles = @{
    "robots.txt" = @"
# Robots.txt file for SEO
User-agent: *
Disallow:

Sitemap: /sitemap.xml
"@
    "sitemap.xml" = @"
<?xml version='1.0' encoding='UTF-8'?>
<urlset xmlns='http://www.sitemaps.org/schemas/sitemap/0.9'>
    <url>
        <loc>https://example.com/</loc>
        <lastmod>$(Get-Date -Format yyyy-MM-dd)</lastmod>
        <priority>1.0</priority>
    </url>
    <url>
        <loc>https://example.com/about</loc>
        <lastmod>$(Get-Date -Format yyyy-MM-dd)</lastmod>
        <priority>0.8</priority>
    </url>
</urlset>
"@
    "humans.txt" = @"
# Humans.txt file
Team:
    Developer: Your Name
    Contact: email@example.com
"@
}

# Function to create folders and files
function Initialize-Structure {
    param (
        [string]$BaseDir,
        [hashtable]$FolderStructure,
        [hashtable]$FileContents
    )

    Write-Host "Initializing flat-file folder structure at: $BaseDir" -ForegroundColor Cyan

    foreach ($folder in $FolderStructure.Keys) {
        $folderPath = Join-Path $BaseDir $folder

        # Create directory
        if (!(Test-Path -Path $folderPath)) {
            New-Item -ItemType Directory -Path $folderPath -Force | Out-Null
            Write-Host "Created folder: $folderPath" -ForegroundColor Green
        } else {
            Write-Host "Folder already exists: $folderPath" -ForegroundColor Yellow
        }

        # Create files in the directory
        foreach ($file in $FolderStructure[$folder]) {
            $filePath = Join-Path $folderPath $file
            $helpText = $FileContents[$file]

            if (!(Test-Path -Path $filePath)) {
                New-Item -ItemType File -Path $filePath -Force | Out-Null
                Write-Host "Created file: $filePath" -ForegroundColor Green

                # Add help text to the file
                if ($helpText) {
                    Set-Content -Path $filePath -Value $helpText
                    Write-Host "Added help text to: $filePath" -ForegroundColor Cyan
                }
            } else {
                Write-Host "File already exists: $filePath" -ForegroundColor Yellow
            }
        }
    }
}

# Function to create SEO files
function Initialize-SEOFiles {
    param (
        [string]$BaseDir,
        [hashtable]$SEOFiles
    )

    Write-Host "Initializing SEO files at: $BaseDir" -ForegroundColor Cyan

    foreach ($file in $SEOFiles.Keys) {
        $filePath = Join-Path $BaseDir $file
        $content = $SEOFiles[$file]

        if (!(Test-Path -Path $filePath)) {
            New-Item -ItemType File -Path $filePath -Force | Out-Null
            Set-Content -Path $filePath -Value $content
            Write-Host "Created SEO file: $filePath" -ForegroundColor Green
        } else {
            Write-Host "SEO file already exists: $filePath" -ForegroundColor Yellow
        }
    }
}

# Create top-level files
function Initialize-TopLevelFiles {
    param (
        [string]$BaseDir
    )

    $topLevelFiles = @{
        "README.md"  = "# Project Overview`n`nThis file provides an overview of the project."
        "LICENSE"    = "# License Information`n`nSpecify your project's license here."
        ".gitignore" = "# Git Ignore File`n`nDefine files and folders to ignore in Git."
        "index.html" = "<!-- Main entry point for the site -->"
    }

    foreach ($file in $topLevelFiles.Keys) {
        $filePath = Join-Path $BaseDir $file
        $content = $topLevelFiles[$file]

        if (!(Test-Path -Path $filePath)) {
            New-Item -ItemType File -Path $filePath -Force | Out-Null
            Set-Content -Path $filePath -Value $content
            Write-Host "Created top-level file: $filePath" -ForegroundColor Green
        } else {
            Write-Host "Top-level file already exists: $filePath" -ForegroundColor Yellow
        }
    }
}

# Run the functions
Initialize-Structure -BaseDir $TargetDir -FolderStructure $structure -FileContents $fileHelpText
Initialize-TopLevelFiles -BaseDir $TargetDir
Initialize-SEOFiles -BaseDir $TargetDir -SEOFiles $seoFiles

Write-Host "Flat-file folder structure with SEO files initialization complete!" -ForegroundColor Green
