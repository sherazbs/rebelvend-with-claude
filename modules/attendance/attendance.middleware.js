function requireAuth(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.redirect('/staff/login');
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session || !req.session.user || req.session.user.role !== 'ADMIN') {
    return res.status(403).send('Forbidden');
  }
  next();
}

// Make flash messages and user available to all staff views
function staffLocals(req, res, next) {
  res.locals.user = req.session ? req.session.user : null;
  res.locals.flash = null;
  if (req.session && req.session.flash) {
    res.locals.flash = req.session.flash;
    delete req.session.flash;
  }
  // view helpers
  res.locals.formatTime = (d) => {
    if (!d) return '-';
    return new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  };
  res.locals.formatDate = (d) => {
    if (!d) return '-';
    return new Date(d).toISOString().slice(0, 10);
  };
  res.locals.formatWorked = (m) => {
    if (m == null) return '-';
    const h = Math.floor(m / 60);
    const min = m % 60;
    return `${h}h ${min}m`;
  };
  next();
}

module.exports = { requireAuth, requireAdmin, staffLocals };
