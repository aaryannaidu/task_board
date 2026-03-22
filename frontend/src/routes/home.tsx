import { useNavigate } from "react-router-dom";

const Home = () => {
    const navigate = useNavigate();

    return (
        <div 
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.75), rgba(15, 23, 42, 0.85)), url('https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExdzRsc3kzYzdqMG83cnl2czE1OHJkYTV0N29iZnE0YjlzZmRnZmY4ayZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/TyxMStrdr7EVnel56L/giphy.gif')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 1,
            }}
        >
            <div className="home-container" style={{ margin: 0, position: 'relative', zIndex: 2 }}>
                <h1 className="home-title">Task Board</h1>
                <p className="home-subtitle">
                    Manage your projects and teams with elegant simplicity. 
                    Everything you need in one powerful dashboard.
                </p>
                <div className="btn-group">
                    <button 
                        onClick={() => navigate("/login")}
                        style={{ maxWidth: '160px' }}
                    >
                        Login
                    </button>
                    <button 
                        className="btn-secondary"
                        onClick={() => navigate("/register")}
                        style={{ maxWidth: '160px' }}
                    >
                        Register
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Home;