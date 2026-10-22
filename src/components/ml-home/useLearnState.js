import React from 'react';
import { readProgress, readLast, onProgressChange } from '../../learning/progress';
import { lessonStates } from './learnState';

/* 两张图谱页共用：读进度 → 四态（见 learnState.js）。
   SSR 与首帧返回 null（服务端没有 localStorage），挂载后再读，避免水合失配；
   标记学完、登录切空间、别的标签页改动都会触发重算（onProgressChange）。 */
export default function useLearnState() {
  const [v, setV] = React.useState(null);
  React.useEffect(() => {
    const update = () => setV(lessonStates(readProgress(), readLast()));
    update();
    return onProgressChange(update);
  }, []);
  return v;
}
