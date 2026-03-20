import { useEffect, useState } from "react";

export default function useClientOriginUrl(path: string) {
  const [url, setUrl] = useState("");

  useEffect(() => {
    const origin = window.location.origin;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUrl(`${origin.replace(/\/$/, "")}${path}`);
  }, [path]);

  return url;
}
