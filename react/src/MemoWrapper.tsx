import React, { memo } from "react";
import PropTypes from "prop-types";

const Wrapper = ({ children }) => children;

Wrapper.propTypes = {
  children: PropTypes.node,
};

export default memo(Wrapper);
