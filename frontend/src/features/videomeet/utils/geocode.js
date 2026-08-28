const getMapboxContext = (context, type) =>
    context?.find((item) => item.id?.startsWith(`${type}.`))?.text || null;

export const parseMapboxGeocode = (features) => {
    if (!features?.length) {
        return { placeName: null, city: null, country: null };
    }
    const primary = features[0];
    const context = primary.context || [];

    const resolve = (type) =>
        getMapboxContext(context, type) ||
        features.find((feature) => feature.place_type?.includes(type))?.text ||
        null;

    const country = resolve("country");
    const city = resolve("place");
    const neighborhood = resolve("neighborhood");
    const locality = resolve("locality");

    const poi = features.find((feature) => feature.place_type?.includes("poi"))?.text || null;
    const street = primary.place_type?.includes("address") ? primary.text : null;

    const candidates = [neighborhood, locality, poi, street, primary.text];
    const placeName = candidates.find((name) => name && name !== city) || primary.text || null;

    return { placeName, city, country };
};

export const buildLocationPayload = ({ latitude, longitude, accuracy, username, geocodeResult }) => {
    const { placeName, city, country } = geocodeResult || {};
    const roundedAccuracy = Number.isFinite(accuracy) ? Math.round(accuracy) : null;
    const coordinateLabel = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;

    return {
        type: "location",
        lat: latitude,
        lng: longitude,
        placeName: placeName || null,
        city: city || null,
        country: country || null,
        accuracy: roundedAccuracy,
        label: placeName || coordinateLabel,
        sharedBy: username,
        sharedAt: Date.now()
    };
};

export const getLocationDisplay = (location) => {
    if (!location) {
        return { placeName: "Shared location", cityCountry: "", accuracyText: null };
    }
    const { placeName, city, country, lat, lng, accuracy } = location;

    const resolvedPlaceName =
        placeName ||
        (lat != null && lng != null ? `${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}` : "Shared location");

    const cityCountry = [city, country].filter(Boolean).join(", ");

    return {
        placeName: resolvedPlaceName,
        cityCountry,
        accuracyText: Number.isFinite(accuracy) && accuracy <= 1500 ? `Accuracy ±${Math.round(accuracy)}m` : null
    };
};

export const formatSharedTime = (timestamp) => {
    if (!timestamp) return "Just now";

    try {
        return new Intl.DateTimeFormat(undefined, {
            hour: "numeric",
            minute: "2-digit",
            day: "numeric",
            month: "short"
        }).format(new Date(timestamp));
    } catch {
        return "Just now";
    }
};

export const formatLocationCardTime = (timestamp) => {
    if (!timestamp) return "Just now";

    try {
        const date = new Date(timestamp);
        const datePart = new Intl.DateTimeFormat(undefined, {
            day: "numeric",
            month: "short"
        }).format(date);
        const timePart = new Intl.DateTimeFormat(undefined, {
            hour: "numeric",
            minute: "2-digit"
        }).format(date);

        return `${datePart} • ${timePart}`;
    } catch {
        return "Just now";
    }
};