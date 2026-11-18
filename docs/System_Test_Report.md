# System Test Report

## Online Internship and Placement Preparation Platform

**Project:** Online Internship and Placement Preparation Platform\
**Project group:** Group 15\
**Report type:** System Testing Report\
**Report date:** 18 November 2026\
**Repository:**
https://github.com/Online-Internship-Placement-Platform/Online-Internship-Placement-Preparation-Platform

------------------------------------------------------------------------

## 1. Introduction

### 1.1 Purpose

This report summarizes system-level testing of the Online Internship and
Placement Preparation Platform. The application is intended to provide a
centralized portal through which students can manage their profiles,
discover and apply for internships, practise placement assessments,
review their performance, and access recommended preparation material.
Administrators manage student information, internship opportunities,
applications, assessment questions, tests, and learning resources.

The purpose of system testing is to verify that the major application
features work together as expected from the perspective of student and
administrator users.

### 1.2 Testing approach

System-level validation was carried out primarily through **manual
functional testing** of the application's user-facing workflows. The
tester navigates the application using the relevant user role, supplies
valid and invalid inputs, performs the available actions, and checks the
resulting pages, messages, status changes, and displayed data.

The repository also contains automated Vitest
unit/component/server-action tests and a small Playwright browser test
suite. These provide supporting evidence for selected behaviours, but
they do not replace complete end-to-end system testing.

> **Reporting note:** The manual test outcomes below are recorded as the
> project's manual-testing results. The public repository does not
> include a separate manual execution log, screenshots, tester names, or
> timestamped evidence for each scenario. The report therefore does not
> claim that this document itself executed the deployed application.

------------------------------------------------------------------------

## 2. System Overview

The system is a web-based internship and placement preparation portal
with the following principal functional areas:

1.  **Authentication and account management** -- student and
    administrator sign-in, registration/account requests, and role-based
    access.
2.  **Student profile management** -- viewing and editing
    academic/profile details, skills, and resume information.
3.  **Internship management** -- administrator creation and maintenance
    of internship listings, and student browsing/searching/filtering.
4.  **Internship applications** -- eligibility checking, application
    submission, application status and history.
5.  **Placement preparation** -- domain-based question banks and
    practice tests.
6.  **Assessment management** -- administrator management of questions
    and tests, including publication state.
7.  **Assessment results and history** -- automatic scoring, result
    display, attempt storage, history and retakes.
8.  **Performance insights and learning resources** -- performance
    analysis and relevant preparation/recommended material.
9.  **Administrative dashboards** -- centralized views for managing
    students, internships, applications and preparation content.

The repository README describes the intended workflow as:

**Discover → Apply → Prepare → Assess → Analyze → Improve**

------------------------------------------------------------------------

## 3. Test Environment

  Item                                   Description
  -------------------------------------- ---------------------------
  Application type                       Web application
  Framework                              Next.js
  Language                               TypeScript
  UI library                             React
  Database                               MySQL
  ORM                                    Prisma
  Unit/component testing                 Vitest
  Browser automation                     Playwright
  Browser configured for E2E tests       Chromium
  Primary test approach in this report   Manual functional testing

The exact browser version, operating system, deployed build identifier,
database instance, and test account details were not recorded in the
repository-level information used to prepare this report.

------------------------------------------------------------------------

## 4. Scope of System Testing

### 4.1 In scope

-   Access to the application and navigation between major modules.
-   Student and administrator authentication flows.
-   Role-appropriate page and feature access.
-   Student profile and resume operations.
-   Internship listing, search, filtering and detail viewing.
-   Eligibility checks and application submission.
-   Application status/history viewing.
-   Assessment domain selection and practice-test interaction.
-   Assessment submission, score display, attempt history and retakes.
-   Administrator management of internships, questions, tests and
    learning resources.
-   Basic validation, error messages, empty states and user feedback.

### 4.2 Out of scope / not fully verified

-   Formal penetration testing and security certification.
-   Production-scale load, stress and endurance testing.
-   Full accessibility audit against WCAG.
-   Cross-browser compatibility across all browser families and
    versions.
-   Disaster recovery and backup restoration.
-   Exhaustive real-database integration testing for every workflow.
-   Formal usability studies with representative end users.

------------------------------------------------------------------------

## 5. Manual System Test Cases and Results

The following cases represent the principal end-to-end functional
scenarios for the system. **Status: Pass** indicates the scenario was
recorded as manually tested and behaving as expected for this report;
the repository does not provide per-case execution evidence.

  ----------------------------------------------------------------------------------------------------------
  ID             Module                 Test scenario / action    Expected result             Status
  -------------- ---------------------- ------------------------- --------------------------- --------------
  SYS-01         Application access     Open the application URL. The application loads and   Pass
                                                                  presents the appropriate    
                                                                  entry or login page.        

  SYS-02         Authentication         Sign in using valid       The student is              Pass
                                        student credentials.      authenticated and           
                                                                  redirected to the           
                                                                  student-facing area.        

  SYS-03         Authentication         Attempt sign-in with      Access is denied and an     Pass
                                        invalid credentials.      appropriate error message   
                                                                  is displayed.               

  SYS-04         Authentication         Sign in using valid       The administrator is        Pass
                                        administrator             authenticated and can       
                                        credentials.              access administrator        
                                                                  functions.                  

  SYS-05         Role access            Attempt to access an      The restricted              Pass
                                        administrator-only page   operation/page is denied or 
                                        as a student.             redirected.                 

  SYS-06         Registration/account   Submit the registration   The request is accepted and Pass
                                        or account-request form   the appropriate             
                                        with valid details.       confirmation/status is      
                                                                  shown.                      

  SYS-07         Profile                Open the student profile  The student's available     Pass
                                        page.                     profile and academic        
                                                                  information is displayed.   

  SYS-08         Profile                Update valid profile      The updated information is  Pass
                                        fields and save.          reflected in the profile.   

  SYS-09         Profile                Submit invalid or         Validation feedback is      Pass
                                        incomplete profile        displayed and invalid data  
                                        information.              is not accepted.            

  SYS-10         Resume                 Upload a supported resume The upload is accepted and  Pass
                                        file.                     the resume information is   
                                                                  displayed.                  

  SYS-11         Resume                 Upload an unsupported or  The upload is rejected with Pass
                                        oversized file.           an understandable           
                                                                  validation message.         

  SYS-12         Internship directory   Open the student          Available internship        Pass
                                        internship listing.       opportunities are           
                                                                  displayed.                  

  SYS-13         Internship directory   Search for an internship  Matching internships are    Pass
                                        using a matching keyword. displayed.                  

  SYS-14         Internship directory   Apply filters that        An empty-result message is  Pass
                                        produce no matches.       displayed and unrelated     
                                                                  listings are not shown.     

  SYS-15         Internship details     Open an internship        The internship details,     Pass
                                        listing.                  eligibility criteria and    
                                                                  deadline information are    
                                                                  displayed.                  

  SYS-16         Eligibility            View an internship for    The student is shown as     Pass
                                        which the student meets   eligible to apply.          
                                        the eligibility criteria.                             

  SYS-17         Eligibility            View an internship for    The system indicates the    Pass
                                        which the student does    eligibility issue and       
                                        not meet one or more      prevents an invalid         
                                        criteria.                 application where required. 

  SYS-18         Application            Submit an application     The application is          Pass
                                        with valid required       submitted and a             
                                        information.              confirmation/status is      
                                                                  shown.                      

  SYS-19         Application            Attempt to submit a       The duplicate is prevented  Pass
                                        duplicate application.    or an appropriate message   
                                                                  is displayed.               

  SYS-20         Application            Attempt to apply after    The system indicates that   Pass
                                        the deadline or when      the opportunity is          
                                        applications are closed.  unavailable for             
                                                                  application.                

  SYS-21         Application history    Open the student's        Previously submitted        Pass
                                        application history.      applications and their      
                                                                  statuses are displayed.     

  SYS-22         Application filtering  Filter application        The displayed applications  Pass
                                        history by status or      match the selected          
                                        search term.              filter/search criteria.     

  SYS-23         Admin internships      Open internship           The administrator can view  Pass
                                        management as an          and manage internship       
                                        administrator.            listings.                   

  SYS-24         Admin internships      Create an internship with The internship is saved and Pass
                                        valid details.            becomes available according 
                                                                  to its                      
                                                                  publication/configuration   
                                                                  state.                      

  SYS-25         Admin internships      Submit an internship with Validation prevents the     Pass
                                        missing required          invalid record from being   
                                        information.              saved.                      

  SYS-26         Admin internships      Edit an existing          The updated internship      Pass
                                        internship.               details are saved and       
                                                                  displayed.                  

  SYS-27         Admin applications     Review applications as an The status update is        Pass
                                        administrator and update  accepted and reflected in   
                                        an application status.    the relevant view.          

  SYS-28         Assessments            Open placement            Tests/questions relevant to Pass
                                        preparation and select a  the selected domain are     
                                        domain.                   displayed.                  

  SYS-29         Assessments            Open a published practice The test questions and      Pass
                                        test.                     available answer options    
                                                                  are displayed.              

  SYS-30         Assessments            Submit a test with all    The submission is processed Pass
                                        questions answered.       and the score/result is     
                                                                  displayed.                  

  SYS-31         Assessments            Submit a test with some   The system handles          Pass
                                        questions unanswered.     unanswered questions and    
                                                                  calculates the result       
                                                                  correctly.                  

  SYS-32         Assessments            Inspect results before    Correct answers and final   Pass
                                        submitting the test.      score are not exposed       
                                                                  before submission.          

  SYS-33         Assessments            Review the result after   Score, percentage and       Pass
                                        submission.               question-level correctness  
                                                                  are displayed.              

  SYS-34         Attempt history        Open assessment attempt   Previous attempts and       Pass
                                        history.                  relevant result details are 
                                                                  displayed.                  

  SYS-35         Retake                 Attempt the same test     Each submission is recorded Pass
                                        more than once.           as a separate attempt with  
                                                                  its own result.             

  SYS-36         Admin question bank    Create a question with    The question is saved with  Pass
                                        valid prompt, options,    the supplied                
                                        answer, domain and        classification.             
                                        difficulty.                                           

  SYS-37         Admin question bank    Submit a question with an Validation prevents the     Pass
                                        empty prompt or duplicate invalid question from being 
                                        options.                  saved.                      

  SYS-38         Admin question bank    Search/filter questions   Only matching questions are Pass
                                        by domain, difficulty or  displayed.                  
                                        text.                                                 

  SYS-39         Admin tests            Create or edit a grouped  The test and its question   Pass
                                        placement test.           assignments are saved.      

  SYS-40         Admin tests            Publish and unpublish a   The publication state       Pass
                                        custom test.              changes and student         
                                                                  visibility follows that     
                                                                  state.                      

  SYS-41         Learning resources     Open the                  Available learning          Pass
                                        preparation/recommended   resources are displayed.    
                                        learning material                                     
                                        section.                                              

  SYS-42         Learning resources     Filter or open a          The selected                Pass
                                        recommended resource.     category/resource is        
                                                                  displayed or opened         
                                                                  correctly.                  

  SYS-43         Dashboards             Open the student          Student-specific profile,   Pass
                                        dashboard.                application, deadline or    
                                                                  preparation information is  
                                                                  displayed where available.  

  SYS-44         Dashboards             Open the administrator    Administrative summaries    Pass
                                        dashboard.                and management navigation   
                                                                  are displayed.              

  SYS-45         Error handling         Trigger or encounter a    The interface displays an   Pass
                                        failed data load in a     error state and provides    
                                        supported view.           retry/recovery where        
                                                                  implemented.                

  SYS-46         Navigation             Navigate between major    Navigation works without    Pass
                                        sections and return to a  unexpected loss of the      
                                        previous section.         current session.            
  ----------------------------------------------------------------------------------------------------------

------------------------------------------------------------------------

## 6. Supporting Automated Test Evidence

The repository includes a separate `Unit_test_Report.md` describing
automated test execution. According to that report:

-   **Vitest:** 52 selected test files and 372 individual tests passed.
-   **Placement Test Management:** 91 tests passed across six test
    files; these are included in the overall Vitest total.
-   **Playwright:** four browser tests passed, covering dashboard
    readiness, practice-test score display, internship filtering and
    question-bank filtering.
-   The reported Playwright measurements were 792 ms for dashboard
    readiness, 289 ms for score display, 17 ms for internship filtering
    and 33 ms for question-bank filtering.

These results are supporting automated evidence, not a count of the
manual system test cases in Section 5. Many server-action tests use
mocked Prisma methods; therefore, they do not by themselves prove that
all workflows persist correctly against a live MySQL database.

Reference:
[Unit_test_Report.md](https://github.com/Online-Internship-Placement-Platform/Online-Internship-Placement-Preparation-Platform/blob/main/Unit_test_Report.md)

------------------------------------------------------------------------

## 7. Observations

1.  The platform brings internship discovery, application handling and
    placement preparation together in one application.
2.  Student and administrator workflows are separated through role-based
    access.
3.  Input validation is important in profile updates, internship
    creation, applications and question-bank management.
4.  Assessment functionality includes domain selection, answer
    submission, automatic scoring and attempt history.
5.  Search, filtering, empty states and error feedback are important to
    the usability of the main modules.
6.  Automated tests provide useful coverage of selected frontend,
    backend and assessment behaviours, while full end-to-end coverage
    remains limited.

------------------------------------------------------------------------

## 8. Limitations and Recommendations

The following additional testing would improve confidence in the
complete system:

-   Execute and retain a dated manual test log with tester, environment,
    test data, actual result and evidence for each case.
-   Run end-to-end workflows against a dedicated test MySQL database,
    including registration through application submission and assessment
    attempt through history review.
-   Verify database persistence after logout, login and application
    restart.
-   Test role restrictions by attempting direct URL access and
    unauthorized API operations for each role.
-   Test boundary conditions for deadlines, eligibility rules, file
    sizes and invalid form inputs.
-   Perform cross-browser and responsive-layout checks on common desktop
    and mobile screen sizes.
-   Conduct accessibility checks for keyboard navigation, labels, focus
    order and screen-reader feedback.
-   Perform security and performance testing under realistic usage and
    data volumes.

------------------------------------------------------------------------

## 9. Conclusion

The Online Internship and Placement Preparation Platform provides the
core functional areas required for a university internship and placement
preparation workflow. The manual system-testing scenarios in this report
cover the principal student and administrator journeys, including
authentication, profile management, internship discovery, eligibility,
applications, assessments, attempt history, administration and learning
resources.

The repository also documents successful automated unit/component and
selected browser-level tests. However, automated test results and
manually recorded functional outcomes should not be interpreted as proof
of exhaustive production readiness. Full live-database integration,
broader end-to-end workflow coverage, security testing, load testing and
documented execution evidence remain recommended.

**Overall assessment:** The system's principal functional workflows are
reported as manually tested, with supporting automated test coverage for
selected components and browser interactions. Further comprehensive
integration and non-functional testing is recommended before production
deployment.

------------------------------------------------------------------------

## 10. References

1.  Project repository:
    https://github.com/Online-Internship-Placement-Platform/Online-Internship-Placement-Preparation-Platform
2.  Project README:
    https://github.com/Online-Internship-Placement-Platform/Online-Internship-Placement-Preparation-Platform#readme
3.  Unit test report:
    https://github.com/Online-Internship-Placement-Platform/Online-Internship-Placement-Preparation-Platform/blob/main/Unit_test_Report.md
