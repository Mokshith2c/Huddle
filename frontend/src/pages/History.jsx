import { useContext, useState, useEffect } from 'react';
import { Link } from "react-router-dom";
import { AuthContext } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import withAuth from '../utils/withAuth';

function History() {
    const { getHistoryOfUser, getMediaHistory } = useContext(AuthContext);
    const [meetings, setMeetings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [mediaMap, setMediaMap] = useState({});
    const [activeMeeting, setActiveMeeting] = useState(null);
    const navigate = useNavigate();
    const activeMedia = activeMeeting
        ? (Array.isArray(mediaMap[activeMeeting]) ? mediaMap[activeMeeting] : [])
        : [];

    const formatDate = (dateValue) => {
        const parsedDate = new Date(dateValue);
        return parsedDate.toLocaleString();
    };

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const history = await getHistoryOfUser();
                const media = await getMediaHistory();

                setMeetings(Array.isArray(history) ? history : []);
                setMediaMap(media || {});
            } catch (err) {
                console.log("ERROR: ", err);
                const message = err.response?.data?.message || 'Unable to load meeting history.';
                setError(message);
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, [getHistoryOfUser, getMediaHistory]);
    const handleLogout = () => {
        localStorage.removeItem("token");
        navigate("/");
    };

    const handleDownload = async (url, filename) => {
        try {
            const response = await fetch(url);
            const blob = await response.blob();

            const fileURL = window.URL.createObjectURL(blob);

            const link = document.createElement("a");
            link.href = fileURL;
            link.download = filename;

            document.body.appendChild(link);
            link.click();

            link.remove();
            window.URL.revokeObjectURL(fileURL);

        } catch (error) {
            console.error("Download failed:", error);
        }
    };

    return (
        <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(145deg,#020617_0%,#0b1220_56%,#0f172a_100%)] flex flex-col">
            <div className=" absolute inset-0 bg-[radial-gradient(circle_at_78%_16%,rgba(34,211,238,0.12),transparent_38%)] opacity-70"></div>
            <div className=" absolute inset-0 bg-linear-to-b from-cyan-400/5 to-transparent"></div>
            <nav className="relative w-full z-10 flex justify-between items-center pt-8 pl-5 pr-5 flex-wrap gap-4">
                <div>
                    <Link to="/" className=' px-5 text-3xl font-bold tracking-wide text-white drop-shadow-md'>
                        Huddle
                    </Link>
                </div>
                <div className="flex gap-4 md:gap-8 items-center text-white/90 flex-wrap md:flex-nowrap">
                    <button className="transition-colors hover:text-cyan-200 text-base"
                        onClick={() => navigate('/home')}>
                        <i className="fa-solid fa-house"></i>
                        &nbsp;Home
                    </button>
                    <button className="logout-btn" onClick={handleLogout}>
                        <i className="fa-solid fa-right-from-bracket pr-2"></i>
                        Logout
                    </button>
                </div>
            </nav>
            <div className='flex-1 flex flex-col lg:flex-row mt-7 lg:mt-0 justify-center lg:justify-around items-center gap-8 lg:gap-0 px-4'>
                <section className="relative z-10 px-6 md:px-8 pt-10 md:pt-20 pb-10 md:pb-16 w-full lg:w-1/2">
                    <div className="max-w-xl rounded-2xl border border-slate-400/20 bg-slate-900/60 p-6 text-white shadow-[0_10px_32px_rgba(2,6,23,0.35)] backdrop-blur-xs">
                        <p className='text-lg md:text-xl font-semibold'>Meeting History</p>

                        {loading && (
                            <p className='mt-4 text-white/70 text-sm md:text-base'>Loading your meeting history...</p>
                        )}

                        {!loading && error && (
                            <p className='mt-4 text-red-300 text-sm md:text-base'>{error}</p>
                        )}

                        {!loading && !error && meetings.length === 0 && (
                            <p className='mt-4 text-white/70 text-sm md:text-base'>No meetings yet. Join or create one to see it here.</p>
                        )}

                        {!loading && !error && meetings.length > 0 && (
                            <div className='mt-5 max-h-80 space-y-3 overflow-y-auto pr-2'>
                                {meetings.map((meeting) => {
                                    const mediaList = mediaMap[meeting.meetingCode] || [];
                                    return (
                                    <div
                                        key={meeting._id}
                                        className='rounded-xl border border-slate-500/25 bg-slate-800/65 p-4'
                                    >
                                        <p className='text-base md:text-lg font-medium tracking-wide'>
                                            <span className='text-cyan-200'>Meeting Code: </span>
                                            {meeting.meetingCode}
                                        </p>
                                        <p className='mt-1 text-xs md:text-sm text-white/70'>
                                            Date: {formatDate(meeting.date)}
                                        </p>
                                        <div className="mt-2 flex justify-between items-center">
                                            <p className="text-xs text-white/60">
                                                {mediaList.length} files
                                            </p>

                                            <button
                                                className="flex items-center gap-1 text-[11px]  bg-cyan-700 text-white w-fit py-1 px-3 rounded-xl hover:opacity-100 transition-all duration-200 ease-out hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
                                                onClick={() => setActiveMeeting(meeting.meetingCode)}
                                            >
                                                <i className="fa-regular fa-images"></i>
                                                View Media
                                            </button>
                                            
                                        </div>
                                    </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </section>
                <img src="history.svg" className='w-62 mb-8 mt-1 md:mr-5 md:w-72 lg:w-2/6 drop-shadow-2xl self-center' alt="" />
            </div>
                {activeMeeting && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs px-4"
                        onClick={() => setActiveMeeting(null)}
                    >
                        <div
                            className="relative w-full max-w-4xl max-h-[84vh] flex flex-col rounded-2xl border border-cyan-300/20 bg-slate-900/95 p-5 shadow-[0_18px_50px_rgba(2,6,23,0.75)]"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button
                                className="size-9 absolute right-4 top-4 rounded-full text-slate-300  hover:bg-slate-800 hover:text-white transition-all duration-200 ease-out"
                                onClick={() => setActiveMeeting(null)}
                            >
                                
                                <i className="fa-regular fa-circle-xmark"></i>
                            </button>

                            <div className="mb-5 pr-11">
                                <p className="text-xs uppercase tracking-[0.14em] text-cyan-200/80">Shared Media</p>
                                <h2 className="mt-1 text-xl font-semibold text-white">Meeting {activeMeeting}</h2>
                                <div className="mt-3 inline-flex items-center rounded-full border border-slate-600 bg-slate-800/80 px-3 py-1 text-xs text-slate-200">
                                    <i className="fa-regular fa-images mr-2"></i>
                                    {activeMedia.length} file{activeMedia.length === 1 ? "" : "s"}
                                </div>
                            </div>

                            {activeMedia.length === 0 && (
                                <div className="rounded-xl border border-dashed border-slate-600 bg-slate-800/40 p-8 text-center text-slate-300">
                                    <i className="fa-regular fa-folder-open text-2xl"></i>
                                    <p className="mt-3 text-sm">No media files were shared in this meeting.</p>
                                </div>
                            )}

                            {activeMedia.length > 0 && (
                            <div className='overflow-y-auto px-2'>
                                <div className="grid  grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                    {activeMedia.map((file, index) => {
                                        const isImage = file.mimeType?.startsWith("image/");
                                        const isPDF = file.mimeType === "application/pdf";

                                        return (
                                            <div key={index} className="overflow-hidden rounded-xl border border-slate-700 bg-slate-800/75">
                                                <div className="h-28 w-full bg-slate-900">
                                                    {isImage && (
                                                        <img
                                                            src={file.url}
                                                            alt={file.name || "shared media"}
                                                            className="h-full w-full object-cover"
                                                            />
                                                    )}

                                                    {!isImage && (
                                                        <div className="flex h-full w-full items-center justify-center text-slate-300">
                                                            {isPDF ? (
                                                                <i className="fa-regular fa-file-pdf text-3xl"></i>
                                                            ) : (
                                                                <i className="fa-regular fa-file-lines text-3xl"></i>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="space-y-2 p-3">
                                                    <p className="truncate text-sm font-medium text-white" title={file.name || "file"}>
                                                        {file.name || "Untitled file"}
                                                    </p>
                                                    <p className="text-xs text-slate-400">by {file.senderUsername || "Unknown"}</p>

                                                    <div className="flex items-center gap-2">
                                                        <a
                                                            href={file.url}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="flex items-center gap-1 text-[11px] opacity-70 bg-cyan-800 text-white w-fit py-1 px-2 rounded-xl hover:opacity-100 transition-all duration-300 ease-out hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
                                                        >
                                                            <i className="fa-solid fa-up-right-from-square "></i>
                                                            Open
                                                        </a>

                                                        <button
                                                            onClick={() => handleDownload(file.url, file.name)}
                                                            className="flex items-center gap-1 text-[11px] opacity-70 bg-lime-800 text-white w-fit py-1 px-2 rounded-xl hover:opacity-100 transition-all duration-300 ease-out hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
                                                            >
                                                            <i className="fa-solid fa-download"></i>
                                                            Download
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                            )}
                        </div>
                    </div>
                )}
        </div>
    );
}

export default withAuth(History);