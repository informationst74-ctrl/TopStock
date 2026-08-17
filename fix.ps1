$content = Get-Content -Path index.html -Raw
$content = $content.Replace('\`', '`')
$content = $content.Replace('\${', '${')
Set-Content -Path index.html -Value $content
