import { useEffect, useRef } from "react";

function useEventListener(eventType: string, handler: Function) {
  // Create a ref that stores handler
  const handlerRef = useRef<Function>();
  // Update ref.current value if handler changes.
  // This allows our effect below to always get latest handler ...
  // ... without us needing to pass it in effect deps array ...
  // ... and potentially cause effect to re-run every render.
  useEffect(() => {
    handlerRef.current = handler;
  });

  useEffect(
    () => {
      // Make sure element supports addEventListener
      // On
      console.log("listener created");
      // Create event listener that calls handler function stored in ref
      const internalHandler = (event: CustomEvent) => handlerRef.current(event);
      // Add event listener
      document.addEventListener(eventType, internalHandler);
      // Remove event listener on cleanup
      return () => {
        document.removeEventListener(eventType, internalHandler);
        console.log("listener removed");
      };
    },
    [eventType] // Re-run if eventName
  );
}

export default useEventListener;
