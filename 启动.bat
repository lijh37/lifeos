@echo off
chcp 65001 >nul
rem =====================================================
rem  LifeOS 桌面版启动脚本（Windows）
rem  前置：已安装 Node.js LTS，项目已放置于本目录
rem  首次运行会自动执行 npm install
rem =====================================================
cd /d "%~dp0"

if not exist node_modules (
  echo [0/3] 首次运行：安装依赖中...
  call npm install
  if errorlevel 1 goto :error
)

echo [1/3] 数据库迁移...
call npm run migrate
if errorlevel 1 goto :error

echo [2/3] 生产构建...
call npm run build
if errorlevel 1 goto :error

echo [3/3] 启动服务：http://localhost:3000
echo 关闭本窗口即停止服务。
call npm run start
goto :eof

:error
echo.
echo 启动失败，请检查上方错误信息。
pause
