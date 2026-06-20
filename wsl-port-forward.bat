@echo off
REM LifeOS - Windows 端口转发设置脚本
REM 以管理员身份运行此脚本

echo ========================================
echo  LifeOS - WSL2 端口转发设置
echo ========================================

REM 获取 WSL2 IP
for /f %%i in ('wsl -- ip -4 addr show eth0 ^| grep -oP "(?<=inet\s)\d+(\.\d+){3}"') do set WSL_IP=%%i
echo WSL2 IP: %WSL_IP%

REM 删除旧规则 (如果存在)
netsh interface portproxy delete v4tov4 listenport=3000 >nul 2>&1
netsh advfirewall firewall delete rule name="LifeOS Dev Server" >nul 2>&1

REM 添加端口转发
netsh interface portproxy add v4tov4 listenport=3000 listenaddress=0.0.0.0 connectport=3000 connectaddress=%WSL_IP%
echo [OK] 端口转发: 0.0.0.0:3000 ^-^> %WSL_IP%:3000

REM 添加防火墙规则
netsh advfirewall firewall add rule name="LifeOS Dev Server" dir=in action=allow protocol=TCP localport=3000
echo [OK] 防火墙规则已添加 (端口 3000)

echo.
echo ========================================
echo  设置完成！
echo  现在可以用手机访问 http://[本机IP]:3000
echo  查看本机IP: ipconfig
echo ========================================
pause
