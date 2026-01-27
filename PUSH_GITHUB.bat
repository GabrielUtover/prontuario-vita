@echo off
echo ========================================
echo   Push para GitHub - Prontuario Vita
echo ========================================
echo.

cd /d "%~dp0"

echo Verificando status do Git...
git status
echo.

echo Fazendo push para GitHub...
echo.
echo IMPORTANTE: Quando pedir credenciais:
echo   - Username: silafivita (ou seu username)
echo   - Password: Use um Personal Access Token (nao sua senha)
echo.
echo Se nao tiver token, crie em: https://github.com/settings/tokens
echo.

git push -u origin main

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo   Push realizado com sucesso!
    echo ========================================
    echo.
    echo Acesse: https://github.com/silafivita/Prontu-rio-Vita
) else (
    echo.
    echo ========================================
    echo   Erro ao fazer push
    echo ========================================
    echo.
    echo Verifique:
    echo 1. Se voce tem acesso ao repositorio
    echo 2. Se criou um Personal Access Token
    echo 3. Se usou o token como senha (nao sua senha do GitHub)
    echo.
    echo Consulte o arquivo GITHUB_SETUP.md para mais detalhes
)

pause
