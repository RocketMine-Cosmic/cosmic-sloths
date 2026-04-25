import { useEffect } from 'react';

export default function AuthCallback() {
  useEffect(() => {
    // Close popup immediately after redirect
    // The SDK's onAuth callback handles storing auth data
    window.close();
  }, []);

  return null;
}