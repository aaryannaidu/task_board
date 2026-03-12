import React from "react";
import { createBrowserRouter } from "react-router-dom";
import Home from "../routes/home";
import Register from "../routes/register";

const router = createBrowserRouter([
    {
        path: "/",
        element: <Home />,
    },
    // Adding placeholder routes for Auth based on project.md Phase 1
    {
        path: "/login",
        element: <div>Login Page (TODO)</div>,
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