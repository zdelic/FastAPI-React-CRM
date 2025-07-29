import api from "./axios";

export const fetchProjects = async () => {
  try {
    const response = await api.get("/projects");
    return response.data;
  } catch (error) {
    console.error("Greška prilikom dohvaćanja projekata:", error);
    throw error;
  }
};


export const createProject = async (data: { name: string; description: string }) => {
  const response = await api.post("/projects", data);
  return response.data;
};

export const fetchStructure = async (projectId: number) => {
  const response = await api.get(`/projects/${projectId}/structure`);
  return response.data;
};
