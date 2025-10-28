// src/types/axios-aug.d.ts
import "axios";

declare module "axios" {
  // Dovoljno je dodati ovo i u "InternalAxiosRequestConfig" i u "AxiosRequestConfig"
  export interface AxiosRequestConfig<D = any> {
    hideLoader?: boolean; // tvoj flag
    meta?: any; // npr. { showLoader: false }
  }

  export interface InternalAxiosRequestConfig<D = any> {
    hideLoader?: boolean;
    meta?: any;
  }
}
