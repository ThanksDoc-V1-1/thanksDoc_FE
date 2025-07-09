$file = "c:\Users\Arafat\Desktop\UBER\uber-doc\src\app\business\register\page.js"
$content = Get-Content -Path $file -Raw
$newContent = $content -replace "className=`"w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`"", "className=`"w-full px-3 py-2 border border-gray-600 rounded-lg bg-gray-800 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent`""
$newContent | Set-Content -Path $file

Write-Host "Updated all matching inputs in business register page"

$file = "c:\Users\Arafat\Desktop\UBER\uber-doc\src\app\doctor\register\page.js"
$content = Get-Content -Path $file -Raw
$newContent = $content -replace "className=`"w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`"", "className=`"w-full px-3 py-2 border border-gray-600 rounded-lg bg-gray-800 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent`""
$newContent | Set-Content -Path $file

Write-Host "Updated all matching inputs in doctor register page"
