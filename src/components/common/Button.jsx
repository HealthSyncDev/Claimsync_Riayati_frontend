import React from 'react';

const Button = ({
    children,
    variant = 'primary',
    size = 'md',
    onClick,
    type = 'button',
    className = '',
    disabled = false,
    loading = false,
    leadingIcon,
    trailingIcon,
    fullWidth = false,
    ...rest
}) => {
    const classes = [
        'btn',
        `btn-${variant}`,
        `btn-${size}`,
        loading ? 'btn-loading' : '',
        fullWidth ? 'btn-full' : '',
        className,
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <button
            type={type}
            className={classes}
            onClick={onClick}
            disabled={disabled || loading}
            aria-busy={loading || undefined}
            style={fullWidth ? { width: '100%' } : undefined}
            {...rest}
        >
            {leadingIcon ? <span className="btn-icon btn-icon-leading" aria-hidden="true">{leadingIcon}</span> : null}
            <span className="btn-label">{children}</span>
            {trailingIcon ? <span className="btn-icon btn-icon-trailing" aria-hidden="true">{trailingIcon}</span> : null}
        </button>
    );
};

export default Button;
