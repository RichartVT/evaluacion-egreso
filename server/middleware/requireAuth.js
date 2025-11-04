// server/middleware/requireAuth.js
import jwt from "jsonwebtoken";

export function requireAuth(roles = []) {
  return (req, res, next) => {
    try {
      const token = req.cookies?.token;
      if (!token) return res.status(401).json({ error: "No autorizado" });
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      if (roles.length && !roles.includes(payload.rol)) {
        return res.status(403).json({ error: "Prohibido" });
      }
      req.user = payload;
      next();
    } catch {
      return res.status(401).json({ error: "Sesión inválida" });
    }
  };
}
