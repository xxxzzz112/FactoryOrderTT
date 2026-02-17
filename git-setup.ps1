# Git 初始化和提交脚本
# 请在新的 PowerShell 窗口中运行此脚本

Write-Host "===================================" -ForegroundColor Green
Write-Host "工厂订单系统 - Git 初始化脚本" -ForegroundColor Green
Write-Host "===================================" -ForegroundColor Green
Write-Host ""

# 切换到项目目录
Set-Location -Path "d:\Coding\Cursor\projects"
Write-Host "当前目录: $(Get-Location)" -ForegroundColor Cyan

# 检查 Git 是否可用
try {
    git --version
    Write-Host "✓ Git 已安装" -ForegroundColor Green
} catch {
    Write-Host "✗ Git 未找到，请重启 PowerShell" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "初始化 Git 仓库..." -ForegroundColor Yellow

# 初始化 Git 仓库
git init

# 配置用户信息（如果还没配置）
$userName = git config user.name
if (-not $userName) {
    Write-Host ""
    Write-Host "请输入您的 Git 用户名（在 GitHub 上显示）:" -ForegroundColor Cyan
    $name = Read-Host
    git config user.name "$name"
}

$userEmail = git config user.email
if (-not $userEmail) {
    Write-Host ""
    Write-Host "请输入您的 Git 邮箱（与 GitHub 账号关联）:" -ForegroundColor Cyan
    $email = Read-Host
    git config user.email "$email"
}

Write-Host ""
Write-Host "添加所有文件到 Git..." -ForegroundColor Yellow
git add .

Write-Host ""
Write-Host "创建初始提交..." -ForegroundColor Yellow
git commit -m "Initial commit - Factory Orders Management System"

Write-Host ""
Write-Host "===================================" -ForegroundColor Green
Write-Host "✓ Git 初始化完成！" -ForegroundColor Green
Write-Host "===================================" -ForegroundColor Green
Write-Host ""

Write-Host "下一步：在 GitHub 创建仓库" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. 访问: https://github.com/new" -ForegroundColor White
Write-Host "2. Repository name: factory-orders-system" -ForegroundColor White
Write-Host "3. 选择 Public 或 Private" -ForegroundColor White
Write-Host "4. 不要勾选任何初始化选项" -ForegroundColor White
Write-Host "5. 点击 'Create repository'" -ForegroundColor White
Write-Host ""
Write-Host "创建完成后，执行以下命令（替换为您的用户名）：" -ForegroundColor Cyan
Write-Host ""
Write-Host "git remote add origin https://github.com/您的用户名/factory-orders-system.git" -ForegroundColor Yellow
Write-Host "git branch -M main" -ForegroundColor Yellow
Write-Host "git push -u origin main" -ForegroundColor Yellow
Write-Host ""
Write-Host "按任意键退出..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
