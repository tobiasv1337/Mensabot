type StopPropagationEvent = { stopPropagation?: () => void };

export const openGoogleMaps = (lat: number, lng: number, event?: StopPropagationEvent) => {
  event?.stopPropagation?.();
  const newWindow = window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, "_blank", "noopener,noreferrer");
  if (!newWindow) {
    window.alert(
      "Unable to open Google Maps. Please check your browser's popup settings and try again."
    );
  }
};
