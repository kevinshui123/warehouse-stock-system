# ============================================================
# Vercel 部署 - 环境变量清单
# ============================================================
# 在 Vercel Dashboard → Project → Settings → Environment Variables 中添加以下变量
#
# 注意：
# - 所有变量都在 "Production", "Preview", "Development" 三个环境都添加
# - 敏感信息不要加引号
# ============================================================

# ---------- 数据库 ----------
DATABASE_URL=mongodb+srv://shuikevin591_db_user:ZOOJKh3XhtvkbtHd@cluster0.nqr4bag.mongodb.net/stockly?retryWrites=true&w=majority

# ---------- 认证 ----------
JWT_SECRET=stockly-jwt-secret-key-for-local-development-2024

# ---------- API 地址（重要！部署后替换） ----------
NEXT_PUBLIC_API_URL=https://your-project-name.vercel.app

# ---------- 图片上传（ImageKit） ----------
# 可选：如果你用到产品图片上传功能
# IMAGEKIT_PUBLIC_KEY=
# IMAGEKIT_PRIVATE_KEY=
# IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/your-imagekit-id/

# ---------- 邮件服务（Upstash Resend） ----------
# 可选：如果你用到邮件通知功能
# RESEND_API_KEY=
# UPSTASH_REDIS_REST_URL=
# UPSTASH_REDIS_REST_TOKEN=
# UPSTASH_QSTASH_TOKEN=
# UPSTASH_QSTASH_CURRENT_SIGNING_KEY=
# UPSTASH_QSTASH_NEXT_SIGNING_KEY=

# ---------- Sentry（错误监控） ----------
# 可选：生产环境建议启用
# SENTRY_DSN=
# SENTRY_AUTH_TOKEN=
# SENTRY_ORG=
# SENTRY_PROJECT=

# ============================================================
# 部署步骤
# ============================================================
# 1. 在 Vercel (https://vercel.com) 创建账号并导入项目
# 2. 在 Project Settings → Environment Variables 添加以上变量
#    （NEXT_PUBLIC_API_URL 部署后根据实际 URL 填写）
# 3. 点击 Deploy 部署
# 4. 部署成功后，将 Vercel 分配的域名填入 NEXT_PUBLIC_API_URL
# 5. 重新 Deploy 一次
# ============================================================
