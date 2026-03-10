import React from "react";
import logo from "@/assets/aiinasia-logo.png";

const EditorialCallout: React.FC = () => {
  const handleDropTake = () => {
    const commentsSection = document.getElementById("comments-section");
    if (commentsSection) {
      commentsSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    const title = document.title;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        // User cancelled or share failed — fall back to clipboard
        await navigator.clipboard.writeText(url);
      }
    } else {
      await navigator.clipboard.writeText(url);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Serif+Display:ital@0;1&display=swap');

        .editorial-callout-wrapper {
          padding: 36px 0 8px;
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 100%;
          box-sizing: border-box;
        }

        .editorial-callout-inner {
          width: 100%;
          max-width: 640px;
        }

        .editorial-view-box {
          background: #161d2a;
          border: 1px solid #1e2d42;
          border-left: 3px solid #5F72FF;
          border-radius: 0 8px 8px 0;
          padding: 28px 32px;
          position: relative;
          overflow: hidden;
        }

        .editorial-view-logo {
          position: absolute;
          top: 14px;
          right: 20px;
          height: 52px;
          width: auto;
        }

        .editorial-view-label {
          font-family: 'DM Sans', sans-serif;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #5F72FF;
          margin: 0 0 14px 0;
        }

        .editorial-view-body {
          font-family: 'DM Serif Display', serif;
          font-size: 16px;
          line-height: 1.78;
          color: #c8d6e8;
          margin: 0;
          padding-right: 60px;
        }

        .editorial-divider {
          display: flex;
          flex-direction: row;
          align-items: center;
          width: 100%;
          max-width: 640px;
          padding: 20px 0 16px;
        }

        .editorial-divider-line {
          flex: 1;
          height: 1px;
          background: linear-gradient(to right, #1e2d42, transparent);
        }

        .editorial-divider-diamond {
          margin: 0 12px;
          color: #253448;
          font-size: 12px;
          line-height: 1;
        }

        .editorial-divider-line-right {
          flex: 1;
          height: 1px;
          background: linear-gradient(to left, #1e2d42, transparent);
        }

        .editorial-cta-block {
          padding: 0;
        }

        .editorial-cta-label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-family: 'DM Sans', sans-serif;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #7c9cbf;
          margin: 0 0 10px 0;
        }

        .editorial-cta-dot {
          width: 3px;
          height: 3px;
          border-radius: 50%;
          background: #5F72FF;
          flex-shrink: 0;
        }

        .editorial-cta-question {
          font-family: 'DM Sans', sans-serif;
          font-size: 15px;
          color: #7c9cbf;
          margin: 0 0 18px 0;
          line-height: 1.6;
        }

        .editorial-cta-highlight {
          font-weight: 600;
          color: #a8bdd4;
        }

        .editorial-cta-actions {
          display: flex;
          gap: 10px;
        }

        .editorial-btn-primary {
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          font-weight: 500;
          background: #5F72FF;
          color: #ffffff;
          border: none;
          border-radius: 6px;
          padding: 9px 20px;
          cursor: pointer;
          transition: transform 0.15s ease, background 0.15s ease;
        }

        .editorial-btn-primary:hover {
          transform: translateY(-1px);
          background: #7a8aff;
        }

        .editorial-btn-secondary {
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          font-weight: 500;
          background: transparent;
          color: #7c9cbf;
          border: 1px solid #1e2d42;
          border-radius: 6px;
          padding: 9px 20px;
          cursor: pointer;
          transition: border-color 0.15s ease;
        }

        .editorial-btn-secondary:hover {
          border-color: #253448;
        }
      `}</style>

      <div className="editorial-callout-wrapper">
        <div className="editorial-callout-inner">
          {/* View Box */}
          <div className="editorial-view-box">
            <img
              src={logo}
              alt="AIinAsia"
              className="editorial-view-logo"
            />
            <p className="editorial-view-label">THE AIINASIA VIEW</p>
            <p className="editorial-view-body">
              Asia-Pacific is moving faster on AI adoption than any other region, but the gap between headlines and reality is growing. We cut through the noise to bring you what actually matters: the policies, products, and power shifts shaping AI across the continent. This story is part of that mission.
            </p>
          </div>

          {/* Divider */}
          <div className="editorial-divider">
            <div className="editorial-divider-line" />
            <span className="editorial-divider-diamond">◇</span>
            <div className="editorial-divider-line-right" />
          </div>

          {/* CTA Block */}
          <div className="editorial-cta-block">
            <p className="editorial-cta-label">
              <span className="editorial-cta-dot" />
              YOUR TAKE
            </p>
            <p className="editorial-cta-question">
              We cover the story.{" "}
              <span className="editorial-cta-highlight">You tell us what it means on the ground.</span>
            </p>
            <div className="editorial-cta-actions">
              <button className="editorial-btn-primary" onClick={handleDropTake}>
                Drop your take
              </button>
              <button className="editorial-btn-secondary" onClick={handleShare}>
                Share
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default EditorialCallout;
