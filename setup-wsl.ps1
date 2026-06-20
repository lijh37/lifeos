#requires -RunAsAdministrator

<#
.SYNOPSIS
    LifeOS - 设置 WSL2 端口转发，让手机可以访问开发服务器
.DESCRIPTION
    此脚本自动将 Windows 端口 3000 转发到 WSL2，并添加防火墙规则
    运行后，手机可以通过 http://<本机IP>:3000 访问 LifeOS
#>

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  LifeOS - WSL2 端口转发设置" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 获取 WSL2 IP
$wslIp = wsl -- ip -4 addr show eth0 | Select-String -Pattern "(?<=inet\s)\d+(\.\d+){3}" | ForEach-Object { $_.Matches.Value }
Write-Host "WSL2 IP: " -NoNewline
Write-Host $wslIp -ForegroundColor Yellow

# 获取本机 WiFi IP
$localIp = Get-NetIPAddress -AddressFamily IPv4 | Where-Object {
    $_.InterfaceAlias -notlike '*Loopback*' -and
    $_.InterfaceAlias -notlike '*WSL*' -and
    $_.InterfaceAlias -notlike '*vEthernet*' -and
    $_.PrefixOrigin -eq 'Dhcp'
} | Select-Object -First 1 -ExpandProperty IPAddress

if (-not $localIp) {
    # 尝试其他接口
    $localIp = Get-NetIPAddress -AddressFamily IPv4 | Where-Object {
        $_.InterfaceAlias -notlike '*Loopback*' -and
        $_.InterfaceAlias -notlike '*WSL*'
    } | Select-Object -First 1 -ExpandProperty IPAddress
}
Write-Host "本机 IP: " -NoNewline
Write-Host $localIp -ForegroundColor Yellow

# 删除旧规则
netsh interface portproxy delete v4tov4 listenport=3000 | Out-Null
netsh advfirewall firewall delete rule name="LifeOS Dev Server" | Out-Null

# 添加端口转发
netsh interface portproxy add v4tov4 listenport=3000 listenaddress=0.0.0.0 connectport=3000 connectaddress=$wslIp
Write-Host "[OK] 端口转发: 0.0.0.0:3000 -> $wslIp`:3000" -ForegroundColor Green

# 添加防火墙规则
netsh advfirewall firewall add rule name="LifeOS Dev Server" dir=in action=allow protocol=TCP localport=3000
Write-Host "[OK] 防火墙规则已添加 (TCP 3000)" -ForegroundColor Green

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  设置完成！" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  手机访问: " -NoNewline
Write-Host "http://$localIp`:3000" -ForegroundColor Yellow
Write-Host ""
Write-Host "  PC 访问:   http://localhost:3000"
Write-Host ""
Write-Host "  如需删除转发，以管理员运行:" -ForegroundColor DarkGray
Write-Host "  netsh interface portproxy delete v4tov4 listenport=3000" -ForegroundColor DarkGray

# 验证转发
Write-Host ""
Write-Host "验证端口转发:" -ForegroundColor Cyan
netsh interface portproxy show v4tov4 | Select-String "3000"
