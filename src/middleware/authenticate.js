import jwt from "jsonwebtoken";

const authenticate = (req, res, next) => {
    const token = req.cookies.studio_access;

    if (!token) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized: please log in first",
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        req.user = {
            id: decoded.id,
            name: decoded.name,
            email: decoded.email,
        };

        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized: invalid or expired token",
        });
    }
};

export { authenticate };