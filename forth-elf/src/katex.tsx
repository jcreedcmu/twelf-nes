import katex from "katex";
import { useEffect, useRef } from "react";

function KaTeX({ expr, className }: { expr: string, className?: string }) {
  const containerRef = useRef<HTMLInputElement>(null);

  const __html = katex.renderToString(expr);

  return <span dangerouslySetInnerHTML={{ __html }} className={className ?? ''} />;
}

export default KaTeX;
