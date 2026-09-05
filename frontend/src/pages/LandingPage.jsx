import "./LandingPage.css";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../contexts/AuthContext";
import { toast } from 'robot-toast';
import { base2, error as errorRobot , wave} from 'robot-toast/robots';
const LandingPage = () => {
  const navigate = useNavigate();
  const { handleLogout } = useContext(AuthContext);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleGuestClick = () => {
  toast({
          message: "Sneaky move... 😏, Sign in First",
          position: "bottom-left",
          type: "info",
          theme: "dark",
          robotVariant: wave,
          style: { color: "white", backgroundColor: "oklch(21% 0.034 264.665)", },
          autoClose: 3000,
          draggable: true,
          pauseOnHover: true
        });

    setTimeout(() => {
      navigate("/auth");
    }, 600);
  };
  const backendHost = import.meta.env.VITE_BACKEND_HOST || window.location.hostname;
  const backendPort = import.meta.env.VITE_BACKEND_PORT || "5000";
  const backendProtocol = import.meta.env.VITE_BACKEND_PROTOCOL || "http";
  const server_url = `${backendProtocol}://${backendHost}:${backendPort}`;
  useEffect(() => {
    const wakeServer = async () => {
        toast({
          message: "Welcome to Huddle!",
          position: "bottom-left",
          type: "info",
          theme: "dark",
          robotVariant: base2,
          style: { color: "white", backgroundColor: "oklch(21% 0.034 264.665)", },
          autoClose: 2700,
          draggable: true,
          pauseOnHover: true
        });
          try {
              await fetch(`${server_url}/health`);
          } catch {
              setTimeout(wakeServer, 3000);
          }
      };

      wakeServer();
  }, []);

  return (
    <div className='landingPageContainer'>
      
      <nav className="flex justify-between items-center w-full pt-8 px-5">
        <div>
          <Link to="/" className=' px-5 text-[2.2rem] font-bold tracking-wide text-white drop-shadow-md'>
              Huddle
          </Link>
        </div>

        <button 
          className="md:hidden text-white text-2xl"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <i className="fa-solid fa-bars"></i>
        </button>

        <div className="hidden md:flex gap-8 items-center text-white">
          {
          !localStorage.getItem("token")?
          (
          <>
            <p
              className="cursor-pointer hover:text-cyan-400"
              onClick={handleGuestClick}
            >
              <span>
                <i className="fa-solid fa-user-secret fa-sm" style={{color: "rgb(183, 187, 193)"}}></i>
                Join as Guest
              </span>
            </p>

            <p className="cursor-pointer hover:text-cyan-400"
            onClick={()=>navigate('/auth')}>
              <span>
                <i className="fa-solid fa-user-plus fa-sm pr-5" style={{color: "rgb(183, 187, 193)"}}></i>
                Register
              </span>
            </p>

            <Link to="/auth" className="login-btn">
              <span>
                <i className="fa-solid fa-right-to-bracket fa-sm pr-2"></i>
                Login
              </span>
            </Link>
          </>
          )
          :
          (
          <button className="logout-btn" onClick={handleLogout}>
            <span>
              <i className="fa-solid fa-right-from-bracket fa-sm pr-1"></i>
              Logout
            </span>
          </button>
          )
          }
        </div>


        {mobileMenuOpen && (
          <div className="md:hidden absolute z-20 top-20 left-0 right-0 bg-slate-900/95 border-b border-cyan-500/30 p-4 flex flex-col gap-4 text-white mobile-menu">
            {
            !localStorage.getItem("token")?
            (
            <>
              <p
                className="cursor-pointer text-center hover:text-cyan-400"
                onClick={() => {
                  handleGuestClick();
                  setMobileMenuOpen(false);
                }}
              >
               <span>
                <i className="fa-solid fa-user-secret fa-sm" style={{color: "rgb(183, 187, 193)"}}></i>
                Join as Guest
              </span>
              </p>

              <p className="cursor-pointer text-center hover:text-cyan-400"
              onClick={()=>{
                navigate('/auth');
                setMobileMenuOpen(false);
              }}>
                <span>
                  <i className="fa-solid fa-user-plus fa-sm pr-5" style={{color: "rgb(183, 187, 193)"}}></i>
                  Register
                </span> 
              </p>

              <Link to="/auth" className="login-btn block text-center" onClick={() => setMobileMenuOpen(false)}>
              
              <span>
                <i className="fa-solid fa-right-to-bracket fa-sm pr-1"></i>
                Login
              </span>
              </Link>
            </>
            )
            :
            (
            <button className="logout-btn w-full" onClick={() => {
              handleLogout();
              setMobileMenuOpen(false);
            }}>
              <span>
                <i className="fa-solid fa-right-from-bracket fa-sm pr-1"></i>
                Logout
              </span>
            </button>
            )
            }
          </div>
        )}
      </nav>

      <div className='mt-8 flex flex-col items-center justify-around gap-10 px-6 lg:flex-row lg:gap-0 lg:mr-10'>
        <div className='w-full max-w-2xl lg:w-2/6'>
          <p className='text-white text-[2.8rem] font-bold leading-tight'>
            Meet. Talk. Collaborate.
          </p>

          <p className='mb-7 mt-3 text-lg text-gray-200'>
            Bridge the distance with <span className="text-cyan-400">Huddle </span> 
            <i className="fa-solid fa-heart fa-jello fa-sm" style={{color: "rgb(212, 67, 95)"}}></i>
          </p>

          <Link className="getstarted-btn" to="/home">
            <i className="fa-solid fa-rocket"></i>
            &nbsp;
            Get Started
          </Link>
        </div>

        <img
          src="/huddle-rec.svg"
          alt="app preview"
          className="w-full max-w-120 lg:h-120 lg:w-130"
        />
      </div>

      <div className='mt-24 px-6 pb-16'>
        <h2 className='text-center text-3xl font-bold text-white mb-12'>Why Choose Huddle<i className="fa-solid fa-question fa-sm fa-flip"></i></h2>
        <div className='grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto'>
          
          <div className='bg-slate-900/50 border border-slate-700/40 rounded-lg p-6 text-center'>
            <div className='text-4xl mb-3'>
              <i className="fa-solid fa-video fa-float"style={{ color: "rgb(183, 187, 193)" }}></i>
            </div>
            <h3 className='text-white font-semibold mb-2'>HD Video Calls</h3>
            <p className='text-slate-400 text-sm'>Crystal clear video and audio for seamless meetings</p>
          </div>

          <div className='bg-slate-900/50 border border-slate-700/40 rounded-lg p-6 text-center'>
            <div className='text-4xl mb-3'>
              <i className="fa-solid fa-message fa-jello" style={{color: "rgb(183, 187, 193)"}}></i>
            </div>
            <h3 className='text-white font-semibold mb-2'>Real-time Chat</h3>
            <p className='text-slate-400 text-sm'>Send instant messages alongside your video</p>
          </div>

          <div className='bg-slate-900/50 border border-slate-700/40 rounded-lg p-6 text-center'>
            <div className='text-4xl mb-3'>
              <i className="fa-solid fa-pencil fa-swing" style={{color: "rgb(183, 187, 193)"}}></i>
            </div>
            <h3 className='text-white font-semibold mb-2'>Whiteboard</h3>
            <p className='text-slate-400 text-sm'>Collaborate and draw together in real-time</p>
          </div>

          <div className='bg-slate-900/50 border border-slate-700/40 rounded-lg p-6 text-center'>
            <div className='text-4xl mb-3'>
              <i className="fa-solid fa-desktop fa-float" style={{color: "rgb(183, 187, 193)"}}></i>
            </div>
            <h3 className='text-white font-semibold mb-2'>Screen Sharing</h3>
            <p className='text-slate-400 text-sm'>Share your screen instantly for better collaboration</p>
          </div>
          
          <div className='bg-slate-900/50 border border-slate-700/40 rounded-lg p-6 text-center'>
            <div className='text-4xl mb-3'>
              <i className="fa-solid fa-map-pin fa-wag" style={{color: "rgb(183, 187, 193)"}}></i>
            </div>
            <h3 className='text-white font-semibold mb-2'>Location Sharing</h3>
            <p className='text-slate-400 text-sm'>Instantly share your location for better coordination.</p>
          </div>

          <div className='bg-slate-900/50 border border-slate-700/40 rounded-lg p-6 text-center'>
            <div className='text-4xl mb-3'>
              <i className="fa-solid fa-file fa-flip-360" style={{color: "rgb(183, 187, 193)"}}></i>
            </div>
            <h3 className='text-white font-semibold mb-2'>File Sharing</h3>
            <p className='text-slate-400 text-sm'>Share documents, images, and files instantly during meetings.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;