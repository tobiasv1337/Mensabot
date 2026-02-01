type StopPropagationEvent = { stopPropagation?: () => void };

export const openGoogleMaps = (lat: number, lng: number, event?: StopPropagationEvent) => {
  event?.stopPropagation?.();
  window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, "_blank");
};
