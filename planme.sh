#!/usr/bin/env bash
set -euo pipefail

# ──────────────────────────────────────────────
#  PlanMe Server Management Script
#  Usage: bash planme.sh [command]
# ──────────────────────────────────────────────

REPO="https://github.com/Resistill/PlanMe"
INSTALL_DIR="/opt/planme"
SERVICE_NAME="planme"
DATA_DIR="/opt/planme/data"
PORT="${PLANME_PORT:-3847}"
NODE_MIN_VERSION=18

# ── 颜色 ──────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

info()    { echo -e "${CYAN}[INFO]${NC}  $*"; }
success() { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*" >&2; }
die()     { error "$*"; exit 1; }

# ── Banner ────────────────────────────────────
banner() {
    echo -e "${BOLD}${BLUE}"
    cat << 'EOF'
  ____  _             __  __
 |  _ \| | __ _ _ __ |  \/  | ___
 | |_) | |/ _` | '_ \| |\/| |/ _ \
 |  __/| | (_| | | | | |  | |  __/
 |_|   |_|\__,_|_| |_|_|  |_|\___|
EOF
    echo -e "${NC}${BOLD}  Server Management Script${NC}"
    echo -e "  ${CYAN}https://github.com/Resistill/PlanMe${NC}"
    echo ""
}

# ── 检查 root ─────────────────────────────────
check_root() {
    [[ $EUID -eq 0 ]] || die "请使用 root 或 sudo 运行此脚本"
}

# ── 检查系统 ──────────────────────────────────
check_os() {
    if [[ -f /etc/os-release ]]; then
        source /etc/os-release
        OS=$ID
    else
        die "无法识别操作系统"
    fi
    case "$OS" in
        ubuntu|debian|raspbian) PKG="apt-get" ;;
        centos|rhel|fedora|rocky|almalinux) PKG="yum" ;;
        arch|manjaro) PKG="pacman" ;;
        *) warn "未测试的发行版: $OS，尝试继续..." ; PKG="apt-get" ;;
    esac
}

# ── 安装依赖 ──────────────────────────────────
install_deps() {
    info "检查依赖..."
    # git
    if ! command -v git &>/dev/null; then
        info "安装 git..."
        $PKG install -y git
    fi
    # node
    if ! command -v node &>/dev/null; then
        info "安装 Node.js (via NodeSource)..."
        curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
        $PKG install -y nodejs
    fi
    local ver
    ver=$(node -e "process.exit(parseInt(process.version.slice(1)) < $NODE_MIN_VERSION ? 1 : 0)" 2>/dev/null && echo ok || echo old)
    [[ $ver == "ok" ]] || die "Node.js 版本过低，需要 >= $NODE_MIN_VERSION"
    # pnpm
    if ! command -v pnpm &>/dev/null; then
        info "安装 pnpm..."
        npm install -g pnpm
    fi
    success "依赖检查完成"
}

# ── 拉取代码 ──────────────────────────────────
fetch_code() {
    if [[ -d "$INSTALL_DIR/.git" ]]; then
        info "更新代码..."
        git -C "$INSTALL_DIR" fetch --tags
        git -C "$INSTALL_DIR" pull --rebase
    else
        info "克隆仓库到 $INSTALL_DIR ..."
        git clone "$REPO" "$INSTALL_DIR"
    fi
}

# ── 构建服务端 ────────────────────────────────
build_server() {
    info "安装依赖并构建..."
    cd "$INSTALL_DIR"
    pnpm install --frozen-lockfile 2>/dev/null || pnpm install
    # 只构建 server 包
    pnpm --filter @planme/server build
    success "构建完成"
}

# ── 配置环境 ──────────────────────────────────
write_env() {
    local env_file="$INSTALL_DIR/apps/server/.env"
    if [[ ! -f "$env_file" ]]; then
        info "生成默认配置 $env_file"
        mkdir -p "$DATA_DIR"
        cat > "$env_file" << EOF
PLANME_PORT=$PORT
PLANME_DATA_DIR=$DATA_DIR
EOF
        success "配置文件已创建，可手动编辑: $env_file"
    fi
}

# ── systemd 服务 ──────────────────────────────
write_systemd() {
    local node_bin
    node_bin=$(command -v node)
    local work_dir="$INSTALL_DIR/apps/server"

    cat > "/etc/systemd/system/${SERVICE_NAME}.service" << EOF
[Unit]
Description=PlanMe Server
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$work_dir
EnvironmentFile=-$work_dir/.env
ExecStart=$node_bin dist/index.js
Restart=on-failure
RestartSec=5s
StandardOutput=journal
StandardError=journal
SyslogIdentifier=planme

[Install]
WantedBy=multi-user.target
EOF
    systemctl daemon-reload
    success "systemd 服务已写入"
}

# ── 安装全局命令 ──────────────────────────────
install_cmd() {
    cp "$0" /usr/local/bin/planme
    chmod +x /usr/local/bin/planme
    success "已安装全局命令: planme"
    info "现在可以直接运行: planme start / stop / restart / status / update / uninstall"
}

# ══════════════════════════════════════════════
#  主命令
# ══════════════════════════════════════════════

cmd_install() {
    banner
    check_root
    check_os
    install_deps
    fetch_code
    build_server
    write_env
    write_systemd
    systemctl enable "$SERVICE_NAME"
    systemctl start  "$SERVICE_NAME"
    install_cmd
    echo ""
    success "PlanMe 安装完成！"
    info "端口: $PORT  数据目录: $DATA_DIR"
    info "管理命令: planme {start|stop|restart|status|log|update|uninstall}"
}

cmd_start() {
    check_root
    systemctl start "$SERVICE_NAME"
    success "PlanMe 已启动"
    systemctl --no-pager status "$SERVICE_NAME" | grep -E "Active:|Main PID:"
}

cmd_stop() {
    check_root
    systemctl stop "$SERVICE_NAME"
    success "PlanMe 已停止"
}

cmd_restart() {
    check_root
    systemctl restart "$SERVICE_NAME"
    success "PlanMe 已重启"
    systemctl --no-pager status "$SERVICE_NAME" | grep -E "Active:|Main PID:"
}

cmd_status() {
    systemctl --no-pager status "$SERVICE_NAME"
}

cmd_log() {
    local lines="${1:-100}"
    journalctl -u "$SERVICE_NAME" -n "$lines" --no-pager
}

cmd_update() {
    check_root
    info "停止服务..."
    systemctl stop "$SERVICE_NAME" || true
    fetch_code
    build_server
    write_systemd
    systemctl start "$SERVICE_NAME"
    success "PlanMe 已更新并重启"
    cmd_status
}

cmd_uninstall() {
    check_root
    warn "即将卸载 PlanMe，数据目录 $DATA_DIR 将保留"
    read -rp "确认卸载? [y/N] " confirm
    [[ "${confirm,,}" == "y" ]] || { info "已取消"; exit 0; }

    systemctl stop    "$SERVICE_NAME" 2>/dev/null || true
    systemctl disable "$SERVICE_NAME" 2>/dev/null || true
    rm -f "/etc/systemd/system/${SERVICE_NAME}.service"
    systemctl daemon-reload
    rm -rf "$INSTALL_DIR"
    rm -f /usr/local/bin/planme
    success "PlanMe 已卸载（数据保留在 $DATA_DIR）"
}

cmd_help() {
    banner
    echo -e "${BOLD}用法:${NC} planme <命令>"
    echo ""
    echo -e "${BOLD}命令:${NC}"
    printf "  ${GREEN}%-14s${NC} %s\n" "install"   "一键安装并启动"
    printf "  ${GREEN}%-14s${NC} %s\n" "start"     "启动服务"
    printf "  ${GREEN}%-14s${NC} %s\n" "stop"      "停止服务"
    printf "  ${GREEN}%-14s${NC} %s\n" "restart"   "重启服务"
    printf "  ${GREEN}%-14s${NC} %s\n" "status"    "查看运行状态"
    printf "  ${GREEN}%-14s${NC} %s\n" "log [n]"   "查看日志（默认100行）"
    printf "  ${GREEN}%-14s${NC} %s\n" "update"    "拉取最新代码并重启"
    printf "  ${GREEN}%-14s${NC} %s\n" "uninstall" "卸载服务（保留数据）"
    echo ""
    echo -e "${BOLD}环境变量:${NC}"
    printf "  ${CYAN}%-20s${NC} %s\n" "PLANME_PORT"     "监听端口（默认 3847）"
    printf "  ${CYAN}%-20s${NC} %s\n" "PLANME_DATA_DIR" "数据目录（默认 /opt/planme/data）"
}

# ══════════════════════════════════════════════
#  入口
# ══════════════════════════════════════════════
main() {
    local cmd="${1:-help}"
    case "$cmd" in
        install)   cmd_install ;;
        start)     cmd_start ;;
        stop)      cmd_stop ;;
        restart)   cmd_restart ;;
        status)    cmd_status ;;
        log)       cmd_log "${2:-100}" ;;
        update)    cmd_update ;;
        uninstall) cmd_uninstall ;;
        help|-h|--help) cmd_help ;;
        *) error "未知命令: $cmd"; cmd_help; exit 1 ;;
    esac
}

main "$@"
