// A real anchor, so it can be focused, opened in a new tab and announced as a link, that navigates inside
// the application on a plain click.

export function Link({ to, navigate, children, ...rest }) {
  const onClick = (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    navigate(to);
  };
  return (
    <a href={to} onClick={onClick} {...rest}>
      {children}
    </a>
  );
}
