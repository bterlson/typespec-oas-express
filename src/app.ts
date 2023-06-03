import express, { Request, Response, NextFunction } from 'express';
import { readFileSync } from 'fs';
import { initialize } from 'express-openapi';
import service from './service.js';
import yaml from "js-yaml";

const spec = yaml.load(readFileSync("./tsp-output/@typespec/openapi3/openapi.yaml", "utf-8")) as any;
export const app = express();

initialize({
  app,
  apiDoc: {
    ... spec,
    'x-express-openapi-additional-middleware': [validateAllResponses],
    "x-express-openapi-validation-strict": true
  },
  operations: service
});


app.use(function (err:Error, req: Request, res: Response, next: NextFunction) {
  res.status((err as any).status).json(err);
});

function validateAllResponses(req: any, res: any, next: any) {
  const strictValidation = req.apiDoc['x-express-openapi-validation-strict']
    ? true
    : false;
  if (typeof res.validateResponse === 'function') {
    const send = res.json;
    res.json = function expressOpenAPISend(...args: any[]) {
      const onlyWarn = !strictValidation;
      if (res.get('x-express-openapi-validation-error-for') !== undefined) {
        return send.apply(res, args);
      }
      const body = args[0];
      let validation = res.validateResponse(res.statusCode, body);
      let validationMessage;
      if (validation === undefined) {
        validation = { message: undefined, errors: undefined };
      }
      if (validation.errors) {
        const errorList = Array.from(validation.errors)
          .map((_: any) => _.message)
          .join(',');
        validationMessage = `Invalid response for status code ${res.statusCode}: ${errorList}`;
        // Set to avoid a loop, and to provide the original status code
        res.set(
          'x-express-openapi-validation-error-for',
          res.statusCode.toString()
        );
      }
      if (onlyWarn || !validation.errors) {
        return send.apply(res, args);
      } else {
        res.status(500);
        return res.json({ error: validationMessage });
      }
    };
  }
  next();
}