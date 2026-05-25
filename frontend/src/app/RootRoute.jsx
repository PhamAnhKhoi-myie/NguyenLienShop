import { Outlet, ScrollRestoration } from 'react-router-dom';

function RootRoute() {
    return (
        <>
            <Outlet />
            <ScrollRestoration />
        </>
    );
}

export default RootRoute;
