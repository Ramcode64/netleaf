import type { NextPageContext } from "next";

interface ErrorProps {
  statusCode: number;
}

function ErrorPage({ statusCode }: ErrorProps) {
  return (
    <div style={{ textAlign: "center", padding: "60px 20px", fontFamily: "system-ui" }}>
      <h1 style={{ fontSize: "4rem", color: "#4ade80" }}>{statusCode}</h1>
      <p style={{ fontSize: "1.25rem", color: "#9ca3af" }}>
        {statusCode === 404 ? "Page not found" : "An error occurred"}
      </p>
      <a href="/" style={{ color: "#4ade80" }}>Return home →</a>
    </div>
  );
}

ErrorPage.getInitialProps = ({ res, err }: NextPageContext): ErrorProps => {
  const statusCode = res ? res.statusCode : err ? (err.statusCode ?? 500) : 404;
  return { statusCode };
};

export default ErrorPage;
