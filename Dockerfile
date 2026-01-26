# Build frontend
FROM node:22-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Build backend
FROM mcr.microsoft.com/dotnet/sdk:10.0-alpine AS backend-build
WORKDIR /app
COPY backend/*.csproj ./
RUN dotnet restore
COPY backend/ ./
RUN dotnet publish -c Release -o /app/publish

# Final image
FROM mcr.microsoft.com/dotnet/aspnet:10.0-alpine
WORKDIR /app

# Copy backend
COPY --from=backend-build /app/publish .

# Copy frontend dist to wwwroot
COPY --from=frontend-build /app/frontend/dist ./wwwroot

# Create uploads directory
RUN mkdir -p /app/uploads

# Environment
ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production

EXPOSE 8080

ENTRYPOINT ["dotnet", "backend.dll"]
