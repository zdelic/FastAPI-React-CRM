// src/types/axios.d.ts
import "axios";

declare module "axios" {
  // Dodatno polje koje koristimo u configu
  export interface AxiosRequestConfig<D = any> {
    meta?: {
      showLoader?: boolean;
    };
  }

  // (Opcionalno) za axios v1 u interceptoru se koristi InternalAxiosRequestConfig,
  // ali ovo gore je dovoljno da TaskCalendar/pozivi prihvate meta.
}
