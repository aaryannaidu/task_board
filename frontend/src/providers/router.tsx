import React from "react";
import { createBrowserRouter } from "react-router-dom";
import Home from "../routes/home";
import Register from "../routes/register";
import Login from "../routes/login";

const router = createBrowserRouter([
    {
        path: "/",
        element: <Home />,
    },
    {
        path: "/login",
        element: <Login />,
    },
    {
        path: "/register",
        element: <Register />,
    },
    {
        path: "/profile",
        element: <div>Profile Page (TODO)</div>,
    }
]);

export default router;