export const mediaQuery = {
  mobile: '@media screen and (maxWidth: 768px)',
  tablet: '@media screen and (maxWidth: 1024px)',
  desktop: '@media screen and (minWidth: 1025px)',
  smallMobile: '@media screen and (maxWidth: 480px)'
};

// Usage example:
const styles = {
  container: {
    width: '100%',
    [mediaQuery.mobile]: {
      width: '90%'
    }
  }
}; 