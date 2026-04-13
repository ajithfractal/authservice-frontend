export interface RegisteredApplication {
  id: string;
  applicationName: string;
  applicationCode: string;
}

export interface CreateRegisteredApplicationRequest {
  applicationName: string;
  applicationCode: string;
}
