// Le decimos a TypeScript que, tras autenticarse, la petición lleva el id del usuario.
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export {};
