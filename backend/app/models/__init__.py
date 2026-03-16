from .resume import Resume
from .job import JobListing, SavedSearch, JobAlignment, CompanyIntel
from .setting import Setting

# For backwards compatibility with existing imports like 'from ..models import models'
# We can create a dummy object or just re-export everything
class Models:
    Resume = Resume
    JobListing = JobListing
    SavedSearch = SavedSearch
    JobAlignment = JobAlignment
    CompanyIntel = CompanyIntel
    Setting = Setting

models = Models()
