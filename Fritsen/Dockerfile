FROM microsoft/dotnet:2.1-aspnetcore-runtime
WORKDIR /app
COPY . .
CMD ASPNETCORE_URLS=http://*:$PORT dotnet ./bin/Release/netcoreapp2.1/Fritsen.dll