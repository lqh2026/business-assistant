@echo off
chcp 65001 >nul
echo ╔══════════════════════════════════════════════╗
echo     💼 商业知识问答助手 - 启动程序
echo ╚══════════════════════════════════════════════╝
echo.

:: 检查 Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [错误] 未检测到 Node.js，请先安装 Node.js
    echo 下载地址: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

:: 检查是否已安装依赖
if not exist "node_modules" (
    echo [信息] 首次运行，正在安装依赖...
    echo.
    call npm install
    if %errorlevel% neq 0 (
        echo [错误] 依赖安装失败
        pause
        exit /b 1
    )
    echo.
    echo [成功] 依赖安装完成
    echo.
)

:: 启动服务
echo [信息] 正在启动服务...
echo.
call npm start
