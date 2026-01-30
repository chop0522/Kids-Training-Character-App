import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ParentalGateModal } from '../components/ParentalGateModal';

export function useParentalGate() {
  const resolverRef = useRef<(value: boolean) => void>();
  const [visible, setVisible] = useState(false);

  const requestParentalGate = useCallback((): Promise<boolean> => {
    setVisible(true);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const handlePassed = useCallback(() => {
    setVisible(false);
    resolverRef.current?.(true);
    resolverRef.current = undefined;
  }, []);

  const handleCancel = useCallback(() => {
    setVisible(false);
    resolverRef.current?.(false);
    resolverRef.current = undefined;
  }, []);

  const ParentalGate = useMemo(
    () => <ParentalGateModal visible={visible} onPassed={handlePassed} onCancel={handleCancel} />,
    [visible, handlePassed, handleCancel]
  );

  return { requestParentalGate, ParentalGate };
}
