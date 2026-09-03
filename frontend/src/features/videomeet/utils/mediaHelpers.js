export const silence = () => {
    const ctx = new AudioContext();
    // A ConstantSourceNode at offset 0 outputs true silence — unlike an
    // oscillator, there's no audible tone to leak through even if this
    // track's `enabled` flag is ever mistakenly flipped to true.
    const source = ctx.createConstantSource();
    source.offset.value = 0;

    const dst = ctx.createMediaStreamDestination();
    source.connect(dst);
    source.start();
    ctx.resume();

    const track = dst.stream.getAudioTracks()[0];
    track.addEventListener("ended", () => {
        try { source.stop(); } catch (e) { /* already stopped */ }
        try { ctx.close(); } catch (e) { /* already closed */ }
    });

    // Explicit marker so callers can identify this as a placeholder track
    // without relying on browser-specific behavior around `track.label`.
    return Object.assign(track, { enabled: false, _synthetic: true });
};

export const black = ({ width = 640, height = 480 } = {}) => {
    const canvas = Object.assign(document.createElement("canvas"), { width, height });

    canvas.getContext('2d').fillRect(0, 0, width, height);
    let stream = canvas.captureStream();
    const track = stream.getVideoTracks()[0];
    return Object.assign(track, { enabled: false, _synthetic: true });
};

export const createEmptyStream = () => new MediaStream([black(), silence()]);