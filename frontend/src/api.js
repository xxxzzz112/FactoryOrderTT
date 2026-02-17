// 获取API基础URL，支持环境变量配置
const getBaseURL = () => {
  // 生产环境使用环境变量，开发环境使用代理
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  return ''; // 开发环境使用 Vite 代理
};

// 获取图片URL（处理相对路径和绝对路径）
export function getImageURL(imageUrl) {
  if (!imageUrl) return '';
  if (imageUrl.startsWith('http')) return imageUrl;
  const baseURL = getBaseURL();
  return `${baseURL}${imageUrl}`;
}

export async function api(path, options = {}) {
  const baseURL = getBaseURL();
  const url = path.startsWith('http') ? path : `${baseURL}${path}`;
  
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });
  if (!res.ok) {
    let msg = '请求失败';
    try {
      const data = await res.json();
      msg = data.error?.message || msg;
    } catch {
      // ignore
    }
    throw new Error(msg);
  }
  return res.json();
}

export function formatDate(d) {
  if (!d) return '';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return '';
  return dt.toISOString().slice(0, 10);
}

export function todayStr() {
  return formatDate(new Date());
}
